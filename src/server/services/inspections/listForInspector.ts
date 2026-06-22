import "server-only";
import {
	type IInspection,
	listInspectionsForInspectorDB,
} from "@/server/models/inspections";
import type { InspectionStatus } from "@/server/types";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({
	inspectorId,
	status,
	limit,
	offset,
}: {
	inspectorId: string;
	status: InspectionStatus | "any" | "*";
	limit: number | "*";
	offset: number | "*";
}) {
	return `services:inspections:listForInspector:${inspectorId}:${status}:${limit}:${offset}`;
}

const memo = makeInProcessCache<IInspection[]>();
export function clearInProcessCache(): void {
	memo.clear();
}

export default async function listForInspector({
	inspectorId,
	status,
	limit = 20,
	offset = 0,
	refreshCache,
}: {
	inspectorId: string;
	status?: InspectionStatus;
	limit?: number;
	offset?: number;
	refreshCache?: boolean;
}): Promise<IInspection[]> {
	const result = await withDualLayerCache<IInspection[]>({
		memo,
		memoKey: `${inspectorId}:${status ?? "any"}:${limit}:${offset}`,
		redisKey: getQueryKey({
			inspectorId,
			status: status ?? "any",
			limit,
			offset,
		}),
		redisTtlSeconds: 30,
		refreshCache,
		loader: () =>
			listInspectionsForInspectorDB(
				inspectorId,
				status ? { status } : {},
				limit,
				offset,
			),
	});
	return result ?? [];
}
