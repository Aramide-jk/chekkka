import "server-only";
import { redisDeleteKeys } from "@/server/databases/redis";
import {
	clearInProcessCache as clearList,
	getQueryKey as keyList,
} from "../listForUser";
import {
	clearInProcessCache as clearCount,
	getQueryKey as keyCount,
} from "../unreadCount";

export default async function invalidateCacheKeys({
	userId,
}: {
	userId: string;
}): Promise<void> {
	clearList(userId);
	clearCount(userId);

	await redisDeleteKeys(
		keyList({ userId, limit: "*" }),
		keyCount({ userId }),
	);
}
