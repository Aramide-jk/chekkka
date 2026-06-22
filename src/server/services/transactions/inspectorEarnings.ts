import "server-only";
import { inspectorEarningsDB } from "@/server/models/transactions";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

type Aggregate = Awaited<ReturnType<typeof inspectorEarningsDB>>;

export function getQueryKey({ inspectorId }: { inspectorId: string }) {
	return `services:transactions:inspectorEarnings:${inspectorId}`;
}

const memo = makeInProcessCache<Aggregate>();
export function clearInProcessCache(inspectorId?: string): void {
	memo.clear(inspectorId);
}

export default async function inspectorEarnings({
	inspectorId,
	refreshCache,
}: {
	inspectorId: string;
	refreshCache?: boolean;
}): Promise<Aggregate> {
	const result = await withDualLayerCache<Aggregate>({
		memo,
		memoKey: inspectorId,
		redisKey: getQueryKey({ inspectorId }),
		redisTtlSeconds: 60 * 2,
		refreshCache,
		loader: () => inspectorEarningsDB(inspectorId),
	});
	return result ?? { released: 0, held: 0, totalCount: 0 };
}
