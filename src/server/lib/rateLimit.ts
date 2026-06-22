import "server-only";
import type { NextRequest } from "next/server";
import { Redis } from "../databases/redis";
import getSiteConfig from "../services/siteConfigs/getSiteConfig";
import { getClientIp } from "./clientIp";

export interface RateLimitResult {
	allowed: boolean;
	limit: number;
	remaining: number;
	resetAtMs: number;
}

interface Options {
	windowMs: number;
	maxRequests: number;
}

/**
 * Redis-backed fixed-window rate limiter keyed by client IP + method + path.
 * Fails open when Redis is unavailable so the API stays usable in local dev
 * without a live Redis instance.
 *
 * The siteConfigs runtime config can override the limiter with a kill
 * switch or by disabling it entirely. Per-route options (passed via
 * `withApiHandler`) still set the upper bound for `maxRequests`/`windowMs`
 * — the admin caps those globally via siteConfigs but doesn't override
 * the per-route choice.
 */
export async function enforceRateLimit(
	req: NextRequest,
	options: Options,
): Promise<RateLimitResult> {
	if (process.env.DISABLE_RATE_LIMIT === "1") {
		return {
			allowed: true,
			limit: options.maxRequests,
			remaining: options.maxRequests,
			resetAtMs: Date.now() + options.windowMs,
		};
	}

	// siteConfigs kill switch — admin's runtime escape hatch (gkoi pattern).
	const cfg = await getSiteConfig().catch(() => null);
	if (cfg && (!cfg.rateLimit.enabled || cfg.rateLimit.killSwitch)) {
		return {
			allowed: true,
			limit: options.maxRequests,
			remaining: options.maxRequests,
			resetAtMs: Date.now() + options.windowMs,
		};
	}

	const ip = getClientIp(req);
	const windowSec = Math.ceil(options.windowMs / 1000);
	const bucket = Math.floor(Date.now() / options.windowMs);
	const key = `rl:${ip}:${req.method}:${new URL(req.url).pathname}:${bucket}`;

	try {
		const count = await Redis.incr(key);
		if (count === 1) {
			await Redis.expire(key, windowSec);
		}
		const remaining = Math.max(0, options.maxRequests - count);
		const resetAtMs = (bucket + 1) * options.windowMs;
		return {
			allowed: count <= options.maxRequests,
			limit: options.maxRequests,
			remaining,
			resetAtMs,
		};
	} catch {
		// Fail open
		return {
			allowed: true,
			limit: options.maxRequests,
			remaining: options.maxRequests,
			resetAtMs: Date.now() + options.windowMs,
		};
	}
}

export function applyRateLimitHeaders(
	res: Response,
	result: RateLimitResult,
): Response {
	try {
		res.headers.set("X-RateLimit-Limit", String(result.limit));
		res.headers.set("X-RateLimit-Remaining", String(result.remaining));
		res.headers.set(
			"X-RateLimit-Reset",
			String(Math.floor(result.resetAtMs / 1000)),
		);
	} catch {
		// headers may be immutable in some edges
	}
	return res;
}
