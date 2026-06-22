import "server-only";
import {
	redisRetrieveKeyString,
	redisUpdateKeyString,
} from "../databases/redis";

/**
 * Dual-layer cache helper used by service modules. Each service gets its own
 * in-process Map (short TTL, 5s by default) plus a long-lived Redis layer.
 * Mutations invalidate via the domain's `utils/invalidateCacheKeys.ts`.
 *
 * Mirrors the pattern used in the reference managerenta-client services.
 */

export const IN_PROCESS_TTL_MS = 5_000;

export interface CacheEntry<T> {
	value: T;
	expiresAt: number;
}

export function makeInProcessCache<T>(): {
	get: (key: string) => T | undefined;
	set: (key: string, value: T) => void;
	clear: (key?: string) => void;
	clearPrefix: (prefix: string) => void;
} {
	const store = new Map<string, CacheEntry<T>>();
	return {
		get(key) {
			const e = store.get(key);
			if (!e) return undefined;
			if (e.expiresAt <= Date.now()) {
				store.delete(key);
				return undefined;
			}
			return e.value;
		},
		set(key, value) {
			store.set(key, {
				value,
				expiresAt: Date.now() + IN_PROCESS_TTL_MS,
			});
		},
		clear(key) {
			if (key) store.delete(key);
			else store.clear();
		},
		// Delete every entry whose key starts with `prefix`. Used by caches
		// whose memoKey embeds a sub-key (e.g. `${chatId}:${limit}`) so an
		// invalidation can clear all variants at once — mirroring the Redis
		// `KEYS prefix*` glob the corresponding redisDeleteKeys call uses.
		clearPrefix(prefix) {
			for (const k of store.keys()) {
				if (k.startsWith(prefix)) store.delete(k);
			}
		},
	};
}

/**
 * Convenience wrapper for the most common service pattern:
 *   1. Read in-process Map
 *   2. Read Redis
 *   3. Load from DB, populate both caches
 *
 * Pass `refreshCache: true` to bypass both caches.
 */
export async function withDualLayerCache<T>({
	memo,
	memoKey,
	redisKey,
	redisTtlSeconds = 60 * 60 * 24,
	refreshCache,
	loader,
}: {
	memo: ReturnType<typeof makeInProcessCache<T>>;
	memoKey: string;
	redisKey: string;
	redisTtlSeconds?: number;
	refreshCache?: boolean;
	loader: () => Promise<T | null>;
}): Promise<T | null> {
	if (!refreshCache) {
		const m = memo.get(memoKey);
		if (m !== undefined) return m;

		const cached = await redisRetrieveKeyString<T>(redisKey).catch(
			() => undefined,
		);
		if (cached !== undefined && cached !== null) {
			memo.set(memoKey, cached);
			return cached;
		}
	}

	const fresh = await loader();
	if (fresh === null || fresh === undefined) return null;

	await redisUpdateKeyString<T>(redisKey, fresh, true, redisTtlSeconds).catch(
		() => false,
	);
	memo.set(memoKey, fresh);
	return fresh;
}
