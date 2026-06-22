import "server-only";
import {
	type IBrokerRequest,
	listBrokerRequestsForBuyerDB,
} from "@/server/models/brokerRequests";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({ buyerId }: { buyerId: string }) {
	return `services:brokerRequests:listForBuyer:${buyerId}`;
}

const memo = makeInProcessCache<IBrokerRequest[]>();
export function clearInProcessCache(buyerId?: string): void {
	memo.clear(buyerId);
}

export default async function listForBuyer({
	buyerId,
	refreshCache,
}: {
	buyerId: string;
	refreshCache?: boolean;
}): Promise<IBrokerRequest[]> {
	const result = await withDualLayerCache<IBrokerRequest[]>({
		memo,
		memoKey: buyerId,
		redisKey: getQueryKey({ buyerId }),
		redisTtlSeconds: 60,
		refreshCache,
		loader: () => listBrokerRequestsForBuyerDB(buyerId),
	});
	return result ?? [];
}
