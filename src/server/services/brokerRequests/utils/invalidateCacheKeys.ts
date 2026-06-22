import "server-only";
import { redisDeleteKeys } from "@/server/databases/redis";
import {
	clearInProcessCache as clearAll,
	getQueryKey as keyAll,
} from "../listAll";
import {
	clearInProcessCache as clearBuyer,
	getQueryKey as keyBuyer,
} from "../listForBuyer";

export default async function invalidateCacheKeys({
	buyerId,
}: {
	buyerId?: string;
} = {}): Promise<void> {
	clearAll();
	if (buyerId) clearBuyer(buyerId);

	await redisDeleteKeys(
		keyAll(),
		...(buyerId ? [keyBuyer({ buyerId })] : []),
	);
}
