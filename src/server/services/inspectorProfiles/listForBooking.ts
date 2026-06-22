import "server-only";
import {
	type IInspectorProfile,
	listInspectorsForBookingDB,
} from "@/server/models/inspectorProfiles";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({
	city,
	limit,
	offset,
}: {
	city: string | "*" | "any";
	limit: number | "*";
	offset: number | "*";
}) {
	return `services:inspectorProfiles:listForBooking:${city}:${limit}:${offset}`;
}

const memo = makeInProcessCache<IInspectorProfile[]>();
export function clearInProcessCache(): void {
	memo.clear();
}

export default async function listForBooking({
	city,
	limit = 20,
	offset = 0,
	refreshCache,
}: {
	city?: string;
	limit?: number;
	offset?: number;
	refreshCache?: boolean;
}): Promise<IInspectorProfile[]> {
	const result = await withDualLayerCache<IInspectorProfile[]>({
		memo,
		memoKey: `${city ?? "any"}:${limit}:${offset}`,
		redisKey: getQueryKey({ city: city ?? "any", limit, offset }),
		redisTtlSeconds: 60 * 5,
		refreshCache,
		loader: () => listInspectorsForBookingDB(city, limit, offset),
	});
	return result ?? [];
}
