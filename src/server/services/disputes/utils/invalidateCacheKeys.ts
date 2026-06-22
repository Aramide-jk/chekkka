import "server-only";
import { redisDeleteKeys } from "@/server/databases/redis";
import {
	clearInProcessCache as clearAll,
	getQueryKey as keyAll,
} from "../listAll";

export default async function invalidateCacheKeys(): Promise<void> {
	clearAll();
	await redisDeleteKeys(keyAll());
}
