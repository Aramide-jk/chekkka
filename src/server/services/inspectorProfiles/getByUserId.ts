import "server-only";
import {
	getInspectorProfileByUserIdDB,
	type IInspectorProfile,
} from "@/server/models/inspectorProfiles";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({ userId }: { userId: string }) {
	return `services:inspectorProfiles:getByUserId:${userId}`;
}

const memo = makeInProcessCache<IInspectorProfile>();
export function clearInProcessCache(userId?: string): void {
	memo.clear(userId);
}

export default async function getByUserId({
	userId,
	refreshCache,
}: {
	userId: string;
	refreshCache?: boolean;
}): Promise<IInspectorProfile | null> {
	return withDualLayerCache<IInspectorProfile>({
		memo,
		memoKey: userId,
		redisKey: getQueryKey({ userId }),
		redisTtlSeconds: 60 * 5,
		refreshCache,
		loader: () => getInspectorProfileByUserIdDB(userId),
	});
}
