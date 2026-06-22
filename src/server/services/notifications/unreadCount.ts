import "server-only";
import { unreadCountDB } from "@/server/models/notifications";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({ userId }: { userId: string }) {
	return `services:notifications:unreadCount:${userId}`;
}

const memo = makeInProcessCache<number>();
export function clearInProcessCache(userId?: string): void {
	memo.clear(userId);
}

export default async function unreadCount({
	userId,
	refreshCache,
}: {
	userId: string;
	refreshCache?: boolean;
}): Promise<number> {
	const result = await withDualLayerCache<number>({
		memo,
		memoKey: userId,
		redisKey: getQueryKey({ userId }),
		redisTtlSeconds: 30,
		refreshCache,
		loader: () => unreadCountDB(userId),
	});
	return result ?? 0;
}
