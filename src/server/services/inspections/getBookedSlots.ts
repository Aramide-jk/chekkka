import "server-only";
import { getBookedSlotsForInspectorDB } from "@/server/models/inspections";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

type SlotRow = Awaited<ReturnType<typeof getBookedSlotsForInspectorDB>>[number];

export function getQueryKey({
	inspectorId,
	from,
	to,
}: {
	inspectorId: string;
	from: string;
	to: string;
}) {
	return `services:inspections:getBookedSlots:${inspectorId}:${from}:${to}`;
}

const memo = makeInProcessCache<SlotRow[]>();
export function clearInProcessCache(inspectorId?: string): void {
	if (!inspectorId) memo.clear();
	else memo.clear();
}

export default async function getBookedSlots({
	inspectorId,
	from,
	to,
	refreshCache,
}: {
	inspectorId: string;
	from: Date;
	to: Date;
	refreshCache?: boolean;
}): Promise<SlotRow[]> {
	const fromKey = from.toISOString().slice(0, 10);
	const toKey = to.toISOString().slice(0, 10);

	const result = await withDualLayerCache<SlotRow[]>({
		memo,
		memoKey: `${inspectorId}:${fromKey}:${toKey}`,
		redisKey: getQueryKey({ inspectorId, from: fromKey, to: toKey }),
		redisTtlSeconds: 60,
		refreshCache,
		loader: () => getBookedSlotsForInspectorDB(inspectorId, from, to),
	});
	return result ?? [];
}
