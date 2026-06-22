import "server-only";
import {
	type IInspection,
	listInspectionsByStatusDB,
} from "@/server/models/inspections";
import type { InspectionStatus } from "@/server/types";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({
	status,
	limit,
}: {
	status: InspectionStatus | "*";
	limit: number | "*";
}) {
	return `services:inspections:listByStatus:${status}:${limit}`;
}

const memo = makeInProcessCache<IInspection[]>();
export function clearInProcessCache(): void {
	memo.clear();
}

export default async function listByStatus({
	status,
	limit = 100,
	refreshCache,
}: {
	status: InspectionStatus;
	limit?: number;
	refreshCache?: boolean;
}): Promise<IInspection[]> {
	const result = await withDualLayerCache<IInspection[]>({
		memo,
		memoKey: `${status}:${limit}`,
		redisKey: getQueryKey({ status, limit }),
		redisTtlSeconds: 30,
		refreshCache,
		loader: () => listInspectionsByStatusDB(status, limit),
	});
	return result ?? [];
}
