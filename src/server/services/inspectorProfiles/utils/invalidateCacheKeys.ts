import "server-only";
import { redisDeleteKeys } from "@/server/databases/redis";
import {
	clearInProcessCache as clearById,
	getQueryKey as keyById,
} from "../getByUserId";
import {
	clearInProcessCache as clearList,
	getQueryKey as keyList,
} from "../listForBooking";
import {
	clearInProcessCache as clearPending,
	getQueryKey as keyPending,
} from "../listPendingApplications";

export default async function invalidateCacheKeys({
	userId,
}: {
	userId?: string;
} = {}): Promise<void> {
	if (userId) clearById(userId);
	clearList();
	clearPending();

	await redisDeleteKeys(
		...(userId ? [keyById({ userId })] : []),
		keyList({ city: "*", limit: "*", offset: "*" }),
		keyPending(),
	);
}
