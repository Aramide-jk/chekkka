import "server-only";
import { listPendingApplicationsDB } from "@/server/models/inspectorProfiles";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

type Row = Awaited<ReturnType<typeof listPendingApplicationsDB>>[number];

export function getQueryKey() {
	return `services:inspectorProfiles:listPendingApplications`;
}

const memo = makeInProcessCache<Row[]>();
export function clearInProcessCache(): void {
	memo.clear();
}

export default async function listPendingApplications({
	refreshCache,
}: {
	refreshCache?: boolean;
} = {}): Promise<Row[]> {
	const result = await withDualLayerCache<Row[]>({
		memo,
		memoKey: "all",
		redisKey: getQueryKey(),
		redisTtlSeconds: 60,
		refreshCache,
		loader: () => listPendingApplicationsDB() as Promise<Row[]>,
	});
	return result ?? [];
}
