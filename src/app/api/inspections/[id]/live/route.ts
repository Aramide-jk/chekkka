import { type NextRequest, NextResponse } from "next/server";
import { ErrForbidden, ErrInspectionNotFound } from "@/server/constants/errors";
import { s3GetFileLink } from "@/server/helpers";
import { verifyAuth } from "@/server/lib";
import {
	inspectionPhotoChannel,
	inspectionSectionChannel,
	subscribe,
} from "@/server/lib/pubsub";
import {
	listForInspection,
	PHOTO_CACHE_TTL_SECONDS,
} from "@/server/services/inspectionPhotos";
import { getInspectionById } from "@/server/services/inspections";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function canAccess(
	role: string,
	userId: string,
	ins: {
		buyerId: { toString(): string };
		inspectorId?: unknown;
		assignedInspectorId?: unknown;
	},
) {
	if (role === "admin" || role === "consultant") return true;
	if (role === "buyer") return ins.buyerId.toString() === userId;
	if (role === "inspector") {
		const insp = (
			ins.inspectorId as { toString(): string } | undefined
		)?.toString();
		const assigned = (
			ins.assignedInspectorId as { toString(): string } | undefined
		)?.toString();
		return insp === userId || assigned === userId;
	}
	return false;
}

export async function GET(req: NextRequest, context: Ctx): Promise<Response> {
	try {
		const auth = await verifyAuth(req);
		if (!auth) {
			return NextResponse.json(
				{ code: 401, message: "Unauthenticated", data: null },
				{ status: 401 },
			);
		}
		const { id } = await context.params;
		const ins = await getInspectionById({ id });
		if (!ins) throw ErrInspectionNotFound;
		if (!canAccess(auth.role, auth.userId, ins)) throw ErrForbidden;

		const photoChannel = inspectionPhotoChannel(id);
		const sectionChannel = inspectionSectionChannel(id);

		const stream = new ReadableStream<Uint8Array>({
			async start(controller) {
				const encoder = new TextEncoder();
				let closed = false;
				const send = (event: string, data: unknown) => {
					if (closed) return;
					try {
						controller.enqueue(
							encoder.encode(
								`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
							),
						);
					} catch {
						closed = true;
					}
				};
				const sendComment = () => {
					if (closed) return;
					try {
						controller.enqueue(encoder.encode(`: ping\n\n`));
					} catch {
						closed = true;
					}
				};

				send("hello", { inspectionId: id });

				const existing = await listForInspection({
					inspectionId: id,
				}).catch(() => []);
				// Resolve each stored S3 key to a presigned link before the
				// buyer renders it — the link expires with the photo-list cache
				// window (the data being processed).
				const photos = await Promise.all(
					existing.map(async (p) => ({
						_id: p._id.toString(),
						section: p.section,
						url: await s3GetFileLink({
							fileName: p.url,
							expiresInSeconds: PHOTO_CACHE_TTL_SECONDS,
						}).catch(() => p.url),
						note: p.note,
						sequence: p.sequence,
						// `takenAt` is a Date on a cache miss (fresh from Mongo)
						// but a string on a Redis cache hit (JSON round-trip).
						// Coerce so the snapshot never throws "toISOString is not
						// a function" and break the buyer's live SSE stream.
						takenAt: new Date(p.takenAt).toISOString(),
					})),
				);
				send("snapshot", {
					photos,
					currentSection: ins.currentSection ?? null,
				});

				const unsub = subscribe<Record<string, unknown>>(
					[photoChannel, sectionChannel],
					(channel, payload) => {
						if (channel === photoChannel) {
							send("photo", payload);
						} else if (channel === sectionChannel) {
							send("section", payload);
						}
					},
				);

				const interval = setInterval(sendComment, 15_000);
				const abort = () => {
					closed = true;
					clearInterval(interval);
					unsub();
					try {
						controller.close();
					} catch {
						// already closed
					}
				};
				req.signal.addEventListener("abort", abort, { once: true });
			},
		});

		return new Response(stream, {
			status: 200,
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache, no-transform",
				Connection: "keep-alive",
				"X-Accel-Buffering": "no",
			},
		});
	} catch (err) {
		const code = (err as { code?: number })?.code ?? 500;
		const msg = (err as Error)?.message ?? "Internal error";
		return NextResponse.json(
			{ code, message: msg, data: null },
			{ status: code },
		);
	}
}
