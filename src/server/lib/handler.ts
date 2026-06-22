import "server-only";
import type { NextRequest } from "next/server";
import { connectMongoDB } from "../databases";
import { restResponseTimeHistogram } from "../metrics";
import { getClientIp } from "./clientIp";
import {
	applyRateLimitHeaders,
	enforceRateLimit,
	type RateLimitResult,
} from "./rateLimit";
import { fail, handleError } from "./response";

const DEFAULT_RATE_LIMIT = { windowMs: 60 * 1000, maxRequests: 100 };

interface HandlerOptions {
	route: string;
	rateLimit?: { windowMs: number; maxRequests: number } | false;
}

export type RouteHandler<TCtx = unknown> = (args: {
	req: NextRequest;
	context: TCtx;
}) => Promise<Response> | Response;

/**
 * Wraps a Next.js route handler with rate limiting, MongoDB readiness,
 * Prometheus timing, and consistent error responses.
 */
export function withApiHandler<TCtx = unknown>(
	options: HandlerOptions,
	handler: RouteHandler<TCtx>,
) {
	const rl = options.rateLimit ?? DEFAULT_RATE_LIMIT;

	return async (req: NextRequest, context: TCtx): Promise<Response> => {
		const startNs = process.hrtime.bigint();
		let rlResult: RateLimitResult | null = null;

		try {
			if (rl) {
				rlResult = await enforceRateLimit(req, rl);
				if (!rlResult.allowed) {
					const res = fail(
						429,
						"Too many requests, please try again later.",
					);
					return applyRateLimitHeaders(res, rlResult);
				}
			}

			await connectMongoDB();

			const response = await handler({ req, context });
			if (rlResult) applyRateLimitHeaders(response, rlResult);

			observe(req, response.status, options.route, startNs);
			return response;
		} catch (error) {
			const res = handleError(error);
			if (rlResult) applyRateLimitHeaders(res, rlResult);
			observe(req, res.status, options.route, startNs);
			return res;
		}
	};
}

function observe(
	req: NextRequest,
	status: number,
	route: string,
	startNs: bigint,
): void {
	try {
		const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
		restResponseTimeHistogram.observe(
			{
				ip: getClientIp(req),
				method: req.method,
				route,
				status_code: status,
			},
			elapsedMs,
		);
	} catch {
		// metrics should never break a request
	}
}
