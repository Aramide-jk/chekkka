import "server-only";
import type { default as IoRedis } from "ioredis";
import { Redis } from "../databases/redis";

declare global {
	// eslint-disable-next-line no-var
	var __chekkaRedisSub: IoRedis | undefined;
}

function subscriber(): IoRedis {
	if (global.__chekkaRedisSub) return global.__chekkaRedisSub;
	const sub = Redis.duplicate();
	global.__chekkaRedisSub = sub;
	return sub;
}

/**
 * Publish a JSON payload to a channel. Returns the number of subscribers
 * that received the message (0 if no one is listening — that's fine).
 */
export async function publish<T>(channel: string, payload: T): Promise<number> {
	try {
		return await Redis.publish(channel, JSON.stringify(payload));
	} catch {
		return 0;
	}
}

/**
 * Subscribe to one or more Redis channels. The handler is invoked with the
 * channel name and parsed JSON payload for each incoming message. Returns
 * an unsubscribe function — call it (or use AbortSignal) to release the
 * subscription. The shared subscriber client is reused across calls; that's
 * required because ioredis subscriber mode is per-connection.
 */
export function subscribe<T = unknown>(
	channels: string[],
	handler: (channel: string, payload: T) => void,
	opts?: { signal?: AbortSignal },
): () => void {
	const sub = subscriber();
	const wantedChannels = new Set(channels);

	const onMessage = (channel: string, raw: string) => {
		if (!wantedChannels.has(channel)) return;
		try {
			const parsed = JSON.parse(raw) as T;
			handler(channel, parsed);
		} catch {
			// ignore malformed
		}
	};

	sub.on("message", onMessage);
	sub.subscribe(...channels).catch(() => undefined);

	const cleanup = () => {
		sub.off("message", onMessage);
		// Don't unsubscribe globally — other listeners may still want these channels.
		// ioredis multiplexes; calling unsubscribe affects the whole client.
	};

	if (opts?.signal) {
		opts.signal.addEventListener("abort", cleanup, { once: true });
	}
	return cleanup;
}

export function inspectionPhotoChannel(inspectionId: string): string {
	return `chekka:inspection:${inspectionId}:photos`;
}

export function inspectionSectionChannel(inspectionId: string): string {
	return `chekka:inspection:${inspectionId}:section`;
}

export function adminLiveChannel(): string {
	return `chekka:admin:live`;
}

export function chatChannel(chatId: string): string {
	return `chekka:chat:${chatId}`;
}

export function notificationChannel(userId: string): string {
	return `chekka:notifications:${userId}`;
}
