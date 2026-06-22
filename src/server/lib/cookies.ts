import "server-only";
import type { NextResponse } from "next/server";
import {
	ACCESS_TOKEN_MAX_AGE_SECONDS,
	COOKIE_DOMAIN,
	NODE_ENV,
	REFRESH_TOKEN_MAX_AGE_SECONDS,
} from "../constants";

export const ACCESS_COOKIE = "chekka_access";
export const REFRESH_COOKIE = "chekka_refresh";

function baseOpts() {
	const isProd = NODE_ENV === "production";
	return {
		httpOnly: true,
		secure: isProd,
		sameSite: "lax" as const,
		path: "/",
		domain: COOKIE_DOMAIN || undefined,
	};
}

export function setAuthCookies(
	res: NextResponse,
	{
		accessToken,
		refreshToken,
	}: { accessToken: string; refreshToken: string },
): NextResponse {
	res.cookies.set(ACCESS_COOKIE, accessToken, {
		...baseOpts(),
		maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
	});
	res.cookies.set(REFRESH_COOKIE, refreshToken, {
		...baseOpts(),
		maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
	});
	return res;
}

export function clearAuthCookies(res: NextResponse): NextResponse {
	const opts = { ...baseOpts(), maxAge: 0 };
	res.cookies.set(ACCESS_COOKIE, "", opts);
	res.cookies.set(REFRESH_COOKIE, "", opts);
	return res;
}
