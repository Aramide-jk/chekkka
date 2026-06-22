import "server-only";
import { findActiveChatForBuyerDB, type IChat } from "@/server/models/chats";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({
	buyerId,
	chatType,
}: {
	buyerId: string;
	chatType: "consultant" | "broker" | "*";
}) {
	return `services:chats:findActiveForBuyer:${buyerId}:${chatType}`;
}

const memo = makeInProcessCache<IChat>();
export function clearInProcessCache(buyerId?: string): void {
	if (buyerId) {
		memo.clear(`${buyerId}:consultant`);
		memo.clear(`${buyerId}:broker`);
	} else {
		memo.clear();
	}
}

export default async function findActiveForBuyer({
	buyerId,
	chatType,
	refreshCache,
}: {
	buyerId: string;
	chatType: "consultant" | "broker";
	refreshCache?: boolean;
}): Promise<IChat | null> {
	return withDualLayerCache<IChat>({
		memo,
		memoKey: `${buyerId}:${chatType}`,
		redisKey: getQueryKey({ buyerId, chatType }),
		redisTtlSeconds: 60,
		refreshCache,
		loader: () => findActiveChatForBuyerDB(buyerId, chatType),
	});
}
