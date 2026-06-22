import "server-only";
import {
	type ITransaction,
	listTransactionsForInspectorDB,
} from "@/server/models/transactions";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({ inspectorId }: { inspectorId: string }) {
	return `services:transactions:listForInspector:${inspectorId}`;
}

const memo = makeInProcessCache<ITransaction[]>();
export function clearInProcessCache(inspectorId?: string): void {
	memo.clear(inspectorId);
}

export default async function listForInspector({
	inspectorId,
	refreshCache,
}: {
	inspectorId: string;
	refreshCache?: boolean;
}): Promise<ITransaction[]> {
	const result = await withDualLayerCache<ITransaction[]>({
		memo,
		memoKey: inspectorId,
		redisKey: getQueryKey({ inspectorId }),
		redisTtlSeconds: 60,
		refreshCache,
		loader: () => listTransactionsForInspectorDB(inspectorId),
	});
	return result ?? [];
}
