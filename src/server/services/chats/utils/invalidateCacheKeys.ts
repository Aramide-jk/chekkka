import "server-only";
import { redisDeleteKeys } from "@/server/databases/redis";
import {
	clearInProcessCache as clearActive,
	getQueryKey as keyActive,
} from "../findActiveForBuyer";
import {
	clearInProcessCache as clearById,
	getQueryKey as keyById,
} from "../getChatById";
import {
	clearInProcessCache as clearList,
	getQueryKey as keyList,
} from "../listForUser";

export default async function invalidateCacheKeys({
	id,
	buyerId,
	counterpartyId,
}: {
	id?: string;
	buyerId?: string;
	counterpartyId?: string;
}): Promise<void> {
	if (id) clearById(id);
	if (buyerId) {
		clearList(buyerId);
		clearActive(buyerId);
	}
	if (counterpartyId) clearList(counterpartyId);

	await redisDeleteKeys(
		...(id ? [keyById({ id })] : []),
		...(buyerId
			? [
					keyList({ userId: buyerId, role: "buyer" }),
					keyActive({ buyerId, chatType: "*" }),
				]
			: []),
		...(counterpartyId
			? [keyList({ userId: counterpartyId, role: "counterparty" })]
			: []),
	);
}
