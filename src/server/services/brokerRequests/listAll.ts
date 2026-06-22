import "server-only";
import {
	type IBrokerRequest,
	listBrokerRequestsDB,
} from "@/server/models/brokerRequests";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey() {
	return `services:brokerRequests:listAll`;
}

const memo = makeInProcessCache<IBrokerRequest[]>();
export function clearInProcessCache(): void {
	memo.clear();
}

export default async function listAll({
	refreshCache,
}: {
	refreshCache?: boolean;
} = {}): Promise<IBrokerRequest[]> {
	const result = await withDualLayerCache<IBrokerRequest[]>({
		memo,
		memoKey: "all",
		redisKey: getQueryKey(),
		redisTtlSeconds: 60,
		refreshCache,
		loader: () => listBrokerRequestsDB(),
	});
	return result ?? [];
}
