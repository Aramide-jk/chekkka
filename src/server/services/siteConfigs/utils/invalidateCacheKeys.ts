import "server-only";
import { redisDeleteKeys } from "@/server/databases/redis";
import { clearInProcessCache, SITE_CONFIG_REDIS_KEY } from "../getSiteConfig";

/**
 * Invalidate every cache layer for the singleton siteConfigs row. Called by
 * `updateSiteConfig` on every admin write so the next read returns the new
 * values within a single request.
 */
export default async function invalidateCacheKeys(): Promise<void> {
	clearInProcessCache();
	await redisDeleteKeys(SITE_CONFIG_REDIS_KEY).catch(() => undefined);
}
