import "server-only";
import { redisDeleteKeys } from "@/server/databases/redis";
import {
	clearInProcessCache as clearEarnings,
	getQueryKey as keyEarnings,
} from "../inspectorEarnings";
import {
	clearInProcessCache as clearList,
	getQueryKey as keyList,
} from "../listForInspector";

export default async function invalidateCacheKeys({
	inspectorId,
}: {
	inspectorId?: string;
} = {}): Promise<void> {
	if (inspectorId) {
		clearEarnings(inspectorId);
		clearList(inspectorId);
		await redisDeleteKeys(
			keyEarnings({ inspectorId }),
			keyList({ inspectorId }),
		);
	}
}
