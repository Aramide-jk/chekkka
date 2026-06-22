import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/server/lib";
import { notificationChannel, subscribe } from "@/server/lib/pubsub";
import { listForUser, unreadCount } from "@/server/services/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
	try {
		const auth = await verifyAuth(req);
		if (!auth) {
			return NextResponse.json(
				{ code: 401, message: "Unauthenticated", data: null },
				{ status: 401 },
			);
		}

		const channel = notificationChannel(auth.userId);

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

				send("hello", { userId: auth.userId });

				const [items, unread] = await Promise.all([
					listForUser({ userId: auth.userId, limit: 30 }).catch(
						() => [],
					),
					unreadCount({ userId: auth.userId }).catch(() => 0),
				]);
				send("snapshot", {
					notifications: items.map((n) => ({
						_id: n._id.toString(),
						kind: n.kind,
						title: n.title,
						body: n.body,
						link: n.link,
						read: n.read,
						// `listForUser` is Redis-cached; on a cache hit
						// createdAt comes back as an ISO string, not a Date.
						createdAt: new Date(n.createdAt).toISOString(),
					})),
					unreadCount: unread,
				});

				const unsub = subscribe<Record<string, unknown>>(
					[channel],
					(_channel, payload) => {
						send("notification", payload);
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
