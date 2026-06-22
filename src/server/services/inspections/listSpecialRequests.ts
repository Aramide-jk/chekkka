import "server-only";
import {
	type IInspection,
	listSpecialRequestsDB,
} from "@/server/models/inspections";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({ limit }: { limit: number | "*" }) {
	return `services:inspections:listSpecialRequests:${limit}`;
}

const memo = makeInProcessCache<IInspection[]>();
export function clearInProcessCache(): void {
	memo.clear();
}

export default async function listSpecialRequests({
	limit = 100,
	refreshCache,
}: {
	limit?: number;
	refreshCache?: boolean;
} = {}): Promise<IInspection[]> {
	const result = await withDualLayerCache<IInspection[]>({
		memo,
		memoKey: String(limit),
		redisKey: getQueryKey({ limit }),
		redisTtlSeconds: 60,
		refreshCache,
		loader: () => listSpecialRequestsDB(limit),
	});
	return result ?? [];
}
