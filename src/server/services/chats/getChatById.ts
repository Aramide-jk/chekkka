import "server-only";
import { getChatByIdDB, type IChat } from "@/server/models/chats";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({ id }: { id: string }) {
	return `services:chats:getChatById:${id}`;
}

const memo = makeInProcessCache<IChat>();
export function clearInProcessCache(id?: string): void {
	memo.clear(id);
}

export default async function getChatById({
	id,
	refreshCache,
}: {
	id: string;
	refreshCache?: boolean;
}): Promise<IChat | null> {
	return withDualLayerCache<IChat>({
		memo,
		memoKey: id,
		redisKey: getQueryKey({ id }),
		redisTtlSeconds: 60 * 5,
		refreshCache,
		loader: () => getChatByIdDB(id),
	});
}
