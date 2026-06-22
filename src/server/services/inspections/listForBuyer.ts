import "server-only";
import {
	type IInspection,
	listInspectionsForBuyerDB,
} from "@/server/models/inspections";
import type { InspectionStatus } from "@/server/types";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({
	buyerId,
	status,
	limit,
	offset,
}: {
	buyerId: string;
	status: InspectionStatus | "any" | "*";
	limit: number | "*";
	offset: number | "*";
}) {
	return `services:inspections:listForBuyer:${buyerId}:${status}:${limit}:${offset}`;
}

const memo = makeInProcessCache<IInspection[]>();
export function clearInProcessCache(buyerId?: string): void {
	if (!buyerId) memo.clear();
	else memo.clear();
}

export default async function listForBuyer({
	buyerId,
	status,
	limit = 20,
	offset = 0,
	refreshCache,
}: {
	buyerId: string;
	status?: InspectionStatus;
	limit?: number;
	offset?: number;
	refreshCache?: boolean;
}): Promise<IInspection[]> {
	const result = await withDualLayerCache<IInspection[]>({
		memo,
		memoKey: `${buyerId}:${status ?? "any"}:${limit}:${offset}`,
		redisKey: getQueryKey({
			buyerId,
			status: status ?? "any",
			limit,
			offset,
		}),
		redisTtlSeconds: 30,
		refreshCache,
		loader: () =>
			listInspectionsForBuyerDB(
				buyerId,
				status ? { status } : {},
				limit,
				offset,
			),
	});
	return result ?? [];
}
