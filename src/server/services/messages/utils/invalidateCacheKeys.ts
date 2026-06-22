import "server-only";
import { redisDeleteKeys } from "@/server/databases/redis";
import {
	clearInProcessCache as clearList,
	getQueryKey as keyList,
} from "../listForChat";

export default async function invalidateCacheKeys({
	chatId,
}: {
	chatId: string;
}): Promise<void> {
	clearList(chatId);
	await redisDeleteKeys(keyList({ chatId, limit: "*" }));
}
