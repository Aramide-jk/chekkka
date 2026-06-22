import "server-only";
import { redisDeleteKeys } from "@/server/databases/redis";
import {
	clearInProcessCache as clearStatsBuyer,
	getQueryKey as keyStatsBuyer,
} from "../dashboardStatsForBuyer";
import {
	clearInProcessCache as clearStatsInspector,
	getQueryKey as keyStatsInspector,
} from "../dashboardStatsForInspector";
import {
	clearInProcessCache as clearSlots,
	getQueryKey as keySlots,
} from "../getBookedSlots";
import {
	clearInProcessCache as clearById,
	getQueryKey as keyById,
} from "../getInspectionById";
import {
	clearInProcessCache as clearStatus,
	getQueryKey as keyStatus,
} from "../listByStatus";
import {
	clearInProcessCache as clearBuyer,
	getQueryKey as keyBuyer,
} from "../listForBuyer";
import {
	clearInProcessCache as clearInspector,
	getQueryKey as keyInspector,
} from "../listForInspector";
import {
	clearInProcessCache as clearSpecial,
	getQueryKey as keySpecial,
} from "../listSpecialRequests";

export default async function invalidateCacheKeys({
	id,
	buyerId,
	inspectorId,
}: {
	id?: string;
	buyerId?: string;
	inspectorId?: string;
}): Promise<void> {
	if (id) clearById(id);
	if (buyerId) clearBuyer(buyerId);
	if (inspectorId) clearInspector();
	clearStatus();
	clearSpecial();
	if (buyerId) clearStatsBuyer(buyerId);
	if (inspectorId) clearStatsInspector(inspectorId);
	if (inspectorId) clearSlots(inspectorId);

	await redisDeleteKeys(
		...(id ? [keyById({ id })] : []),
		...(buyerId
			? [
					keyBuyer({
						buyerId,
						status: "*",
						limit: "*",
						offset: "*",
					}),
					keyStatsBuyer({ buyerId }),
				]
			: []),
		...(inspectorId
			? [
					keyInspector({
						inspectorId,
						status: "*",
						limit: "*",
						offset: "*",
					}),
					keyStatsInspector({ inspectorId }),
					keySlots({ inspectorId, from: "*", to: "*" }),
				]
			: []),
		keyStatus({ status: "*", limit: "*" }),
		keySpecial({ limit: "*" }),
	);
}
