import "server-only";
import IoRedis from "ioredis";
import { REDIS_URI } from "../constants";

declare global {
	// eslint-disable-next-line no-var
	var __chekkaRedis: IoRedis | undefined;
}

function createRedis(): IoRedis {
	return new IoRedis(REDIS_URI || "redis://127.0.0.1:6379", {
		retryStrategy(times) {
			return Math.min(times * 50, 2000);
		},
		maxRetriesPerRequest: 3,
		enableReadyCheck: true,
		lazyConnect: false,
	});
}

export const Redis: IoRedis = global.__chekkaRedis ?? createRedis();

if (!global.__chekkaRedis) {
	global.__chekkaRedis = Redis;
}

export async function disconnectRedis(): Promise<void> {
	try {
		await Redis.quit();
	} catch {
		// no-op
	}
}

export async function redisUpdateKeyString<T>(
	query: string,
	data: T,
	expire: boolean = true,
	seconds?: number,
): Promise<boolean> {
	seconds = seconds ?? 60;

	if (expire === true) {
		const response = await Redis.setex(
			query,
			seconds,
			JSON.stringify(data),
		);
		return response === "OK";
	}

	const response = await Redis.set(query, JSON.stringify(data));
	return response === "OK";
}

export async function redisRetrieveKeyString<T>(
	query: string,
): Promise<T | undefined> {
	const response = await Redis.get(query);
	if (response === null) return undefined;
	return JSON.parse(response) as T;
}

export async function redisDeleteKeys(...queries: string[]): Promise<boolean> {
	if (queries.length === 0) return false;

	const resolvedKeys = (
		await Promise.allSettled(queries.map((q) => Redis.keys(q)))
	).flatMap((item) => {
		if (item.status === "rejected") return [];
		return item.value as string[];
	});

	if (!resolvedKeys.length) return false;

	const response = await Redis.del(resolvedKeys);
	return response >= 1;
}
