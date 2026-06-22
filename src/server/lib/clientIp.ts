import "server-only";
import type { NextRequest } from "next/server";

/**
 * Extract the client IP from common proxy headers, falling back to "unknown".
 * NOTE: `x-forwarded-for` is spoofable — only trust this behind a known proxy.
 */
export function getClientIp(req: NextRequest): string {
	const xff = req.headers.get("x-forwarded-for");
	if (xff) {
		const first = xff.split(",")[0]?.trim();
		if (first) return first;
	}
	const realIp = req.headers.get("x-real-ip");
	if (realIp) return realIp.trim();
	const cfIp = req.headers.get("cf-connecting-ip");
	if (cfIp) return cfIp.trim();
	return "unknown";
}
