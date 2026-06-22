import "server-only";
import { type IMessage, listMessagesForChatDB } from "@/server/models/messages";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({
	chatId,
	limit,
}: {
	chatId: string;
	limit: number | "*";
}) {
	return `services:messages:listForChat:${chatId}:${limit}`;
}

const memo = makeInProcessCache<IMessage[]>();
export function clearInProcessCache(chatId?: string): void {
	// Entries are keyed `${chatId}:${limit}`, so clear every limit-variant for
	// this chat by prefix — a bare `memo.clear(chatId)` would miss them all and
	// leave stale messages served for the in-process TTL after every write.
	if (chatId) memo.clearPrefix(`${chatId}:`);
	else memo.clear();
}

export default async function listForChat({
	chatId,
	limit = 200,
	refreshCache,
}: {
	chatId: string;
	limit?: number;
	refreshCache?: boolean;
}): Promise<IMessage[]> {
	const result = await withDualLayerCache<IMessage[]>({
		memo,
		memoKey: `${chatId}:${limit}`,
		redisKey: getQueryKey({ chatId, limit }),
		// Messages are live — keep the Redis TTL short, the in-process Map is
		// the primary win for back-to-back reads on the same handler.
		redisTtlSeconds: 15,
		refreshCache,
		loader: () => listMessagesForChatDB(chatId, limit),
	});
	return result ?? [];
}
