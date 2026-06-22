import { type NextRequest, NextResponse } from "next/server";
import { ErrForbidden } from "@/server/constants/errors";
import { hasPermission, verifyAuth } from "@/server/lib";
import { adminLiveChannel, subscribe } from "@/server/lib/pubsub";
import { listByStatus } from "@/server/services/inspections";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<Response> {
	try {
		const auth = await verifyAuth(req);
		if (!auth) {
			return NextResponse.json(
				{ code: 401, message: "Unauthenticated", data: null },
				{ status: 401 },
			);
		}
		// Admins + consultants get this for free (they always need the live
		// monitor for their workflow). Managers must hold `live.view`.
		if (auth.role !== "admin" && auth.role !== "consultant") {
			const allowed = await hasPermission(auth, "live.view");
			if (!allowed) throw ErrForbidden;
		}

		const channel = adminLiveChannel();

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
				const ping = () => {
					if (closed) return;
					try {
						controller.enqueue(encoder.encode(": ping\n\n"));
					} catch {
						closed = true;
					}
				};

				send("hello", { since: new Date().toISOString() });

				const snapshot = await listByStatus({
					status: "in_progress",
					limit: 50,
				}).catch(() => []);
				send("snapshot", { inspections: snapshot });

				const unsub = subscribe<Record<string, unknown>>(
					[channel],
					(_c, payload) => {
						send("event", payload);
					},
				);

				const interval = setInterval(ping, 15_000);
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
