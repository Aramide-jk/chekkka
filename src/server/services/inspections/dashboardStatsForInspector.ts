import "server-only";
import { dashboardStatsForInspectorDB } from "@/server/models/inspections";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export type IInspectorDashboardStats = Awaited<
	ReturnType<typeof dashboardStatsForInspectorDB>
>;

export function getQueryKey({ inspectorId }: { inspectorId: string }) {
	return `services:inspections:dashboardStatsForInspector:${inspectorId}`;
}

const memo = makeInProcessCache<IInspectorDashboardStats>();
export function clearInProcessCache(inspectorId?: string): void {
	memo.clear(inspectorId);
}

export default async function dashboardStatsForInspector({
	inspectorId,
	refreshCache,
}: {
	inspectorId: string;
	refreshCache?: boolean;
}): Promise<IInspectorDashboardStats> {
	const result = await withDualLayerCache<IInspectorDashboardStats>({
		memo,
		memoKey: inspectorId,
		redisKey: getQueryKey({ inspectorId }),
		redisTtlSeconds: 60,
		refreshCache,
		loader: () => dashboardStatsForInspectorDB(inspectorId),
	});
	return result ?? { pending: 0, active: 0, completed: 0 };
}
