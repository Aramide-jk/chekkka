import "server-only";
import { redisDeleteKeys } from "@/server/databases/redis";
import {
	clearInProcessCache as clearList,
	getQueryKey as keyList,
} from "../listForInspection";

export default async function invalidateCacheKeys({
	inspectionId,
}: {
	inspectionId: string;
}): Promise<void> {
	clearList(inspectionId);
	await redisDeleteKeys(keyList({ inspectionId }));
}
