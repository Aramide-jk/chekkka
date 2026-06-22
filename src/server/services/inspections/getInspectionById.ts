import "server-only";
import {
	getInspectionByIdDB,
	type IInspection,
} from "@/server/models/inspections";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({ id }: { id: string }) {
	return `services:inspections:getInspectionById:${id}`;
}

const memo = makeInProcessCache<IInspection>();
export function clearInProcessCache(id?: string): void {
	memo.clear(id);
}

export default async function getInspectionById({
	id,
	refreshCache,
}: {
	id: string;
	refreshCache?: boolean;
}): Promise<IInspection | null> {
	return withDualLayerCache<IInspection>({
		memo,
		memoKey: id,
		redisKey: getQueryKey({ id }),
		redisTtlSeconds: 60,
		refreshCache,
		loader: () => getInspectionByIdDB(id),
	});
}
