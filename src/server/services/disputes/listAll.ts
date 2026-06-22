import "server-only";
import { type IDispute, listDisputesDB } from "@/server/models/disputes";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey() {
	return `services:disputes:listAll`;
}

const memo = makeInProcessCache<IDispute[]>();
export function clearInProcessCache(): void {
	memo.clear();
}

export default async function listAll({
	refreshCache,
}: {
	refreshCache?: boolean;
} = {}): Promise<IDispute[]> {
	const result = await withDualLayerCache<IDispute[]>({
		memo,
		memoKey: "all",
		redisKey: getQueryKey(),
		redisTtlSeconds: 60,
		refreshCache,
		loader: () => listDisputesDB(),
	});
	return result ?? [];
}
