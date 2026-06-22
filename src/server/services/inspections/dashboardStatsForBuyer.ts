import "server-only";
import { dashboardStatsForBuyerDB } from "@/server/models/inspections";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export type IBuyerDashboardStats = Awaited<
	ReturnType<typeof dashboardStatsForBuyerDB>
>;

export function getQueryKey({ buyerId }: { buyerId: string }) {
	return `services:inspections:dashboardStatsForBuyer:${buyerId}`;
}

const memo = makeInProcessCache<IBuyerDashboardStats>();
export function clearInProcessCache(buyerId?: string): void {
	memo.clear(buyerId);
}

export default async function dashboardStatsForBuyer({
	buyerId,
	refreshCache,
}: {
	buyerId: string;
	refreshCache?: boolean;
}): Promise<IBuyerDashboardStats> {
	const result = await withDualLayerCache<IBuyerDashboardStats>({
		memo,
		memoKey: buyerId,
		redisKey: getQueryKey({ buyerId }),
		redisTtlSeconds: 60,
		refreshCache,
		loader: () => dashboardStatsForBuyerDB(buyerId),
	});
	return result ?? { active: 0, completed: 0, worthBuying: 0, avoided: 0 };
}
