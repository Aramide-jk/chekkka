import "server-only";
import {
	getSiteConfigDB,
	type ISiteConfigData,
	SITE_CONFIG_DEFAULTS,
} from "@/server/models/siteConfigs";
import { makeInProcessCache, withDualLayerCache } from "../_cache";

// Per gkoi runtime-config pattern: short in-process window for the hot path,
// long Redis layer that survives between processes, env-constant fallback when
// both miss. The cache TTL is intentionally shorter than the other domain
// caches because settings changes need to propagate quickly across instances.
export const SITE_CONFIG_REDIS_KEY = "services:siteConfigs:current";
const MEMO_KEY = "current";

const memo = makeInProcessCache<ISiteConfigData>();
export function clearInProcessCache(): void {
	memo.clear(MEMO_KEY);
}

/**
 * Returns the resolved site config — every section guaranteed populated by
 * `SITE_CONFIG_DEFAULTS`, even when the DB is unreachable or the singleton
 * row has never been written.
 */
export default async function getSiteConfig({
	refreshCache,
}: {
	refreshCache?: boolean;
} = {}): Promise<ISiteConfigData> {
	const fromCache = await withDualLayerCache<ISiteConfigData>({
		memo,
		memoKey: MEMO_KEY,
		redisKey: SITE_CONFIG_REDIS_KEY,
		// 10s — short enough that an admin's PATCH propagates between
		// dyno restarts in seconds, long enough that the hot path is
		// effectively free.
		redisTtlSeconds: 10,
		refreshCache,
		loader: () => getSiteConfigDB(),
	});

	// Layer DB result (which may be partial if the schema gains new fields
	// after a write) on top of the env-constant defaults so callers never
	// have to defensive-check sub-fields.
	return mergeWithDefaults(fromCache);
}

function mergeWithDefaults(partial: ISiteConfigData | null): ISiteConfigData {
	if (!partial) return SITE_CONFIG_DEFAULTS;
	return {
		general: { ...SITE_CONFIG_DEFAULTS.general, ...partial.general },
		pricing: { ...SITE_CONFIG_DEFAULTS.pricing, ...partial.pricing },
		inspections: {
			...SITE_CONFIG_DEFAULTS.inspections,
			...partial.inspections,
		},
		rateLimit: {
			...SITE_CONFIG_DEFAULTS.rateLimit,
			...partial.rateLimit,
		},
		audit: { ...SITE_CONFIG_DEFAULTS.audit, ...partial.audit },
	};
}
