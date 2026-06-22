import "server-only";
import { type IChat, listChatsForUserDB } from "@/server/models/chats";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

export function getQueryKey({
	userId,
	role,
}: {
	userId: string;
	role: "buyer" | "counterparty" | "*";
}) {
	return `services:chats:listForUser:${userId}:${role}`;
}

const memo = makeInProcessCache<IChat[]>();
export function clearInProcessCache(userId?: string): void {
	if (userId) {
		memo.clear(`${userId}:buyer`);
		memo.clear(`${userId}:counterparty`);
	} else {
		memo.clear();
	}
}

export default async function listForUser({
	userId,
	role,
	refreshCache,
}: {
	userId: string;
	role: "buyer" | "counterparty";
	refreshCache?: boolean;
}): Promise<IChat[]> {
	const result = await withDualLayerCache<IChat[]>({
		memo,
		memoKey: `${userId}:${role}`,
		redisKey: getQueryKey({ userId, role }),
		redisTtlSeconds: 30,
		refreshCache,
		loader: () => listChatsForUserDB(userId, role),
	});
	return result ?? [];
}
