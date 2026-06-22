import "server-only";
import {
	type INotification,
	listNotificationsForUserDB,
} from "@/server/models/notifications";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({
	userId,
	limit,
}: {
	userId: string;
	limit: number | "*";
}) {
	return `services:notifications:listForUser:${userId}:${limit}`;
}

const memo = makeInProcessCache<INotification[]>();
export function clearInProcessCache(userId?: string): void {
	// Keyed `${userId}:${limit}` — clear every limit-variant by prefix. A bare
	// `memo.clear(userId)` misses them all, leaving stale notification lists
	// served for the in-process TTL after a new notification / read-all.
	if (userId) memo.clearPrefix(`${userId}:`);
	else memo.clear();
}

export default async function listForUser({
	userId,
	limit = 30,
	refreshCache,
}: {
	userId: string;
	limit?: number;
	refreshCache?: boolean;
}): Promise<INotification[]> {
	const result = await withDualLayerCache<INotification[]>({
		memo,
		memoKey: `${userId}:${limit}`,
		redisKey: getQueryKey({ userId, limit }),
		redisTtlSeconds: 60,
		refreshCache,
		loader: () => listNotificationsForUserDB(userId, limit),
	});
	return result ?? [];
}
