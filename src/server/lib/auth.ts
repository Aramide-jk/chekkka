import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import { ErrUnauthenticated } from "../constants";
import getUserById from "../services/users/getUserById";
import type { UserRole } from "../types";
import {
	ACCESS_COOKIE,
	clearAuthCookies,
	REFRESH_COOKIE,
	setAuthCookies,
} from "./cookies";
import {
	type IJwtPayload,
	mintTokens,
	verifyAccessToken,
	verifyRefreshToken,
} from "./jwt";

export interface AuthResult {
	userId: string;
	role: UserRole;
	status: string;
	refreshed: boolean;
	newTokens?: { accessToken: string; refreshToken: string };
}

function readCookie(req: NextRequest, name: string): string | undefined {
	const fromCookies = req.cookies.get(name)?.value;
	if (fromCookies) return fromCookies;
	const header = req.headers.get("cookie") || "";
	const m = header.match(new RegExp(`${name}=([^;]+)`));
	return m ? decodeURIComponent(m[1]) : undefined;
}

export async function verifyAuth(req: NextRequest): Promise<AuthResult | null> {
	const access = readCookie(req, ACCESS_COOKIE);
	if (access) {
		const decoded = verifyAccessToken(access);
		if (decoded) {
			return {
				userId: decoded.userId,
				role: decoded.role,
				status: decoded.status,
				refreshed: false,
			};
		}
	}

	const refresh = readCookie(req, REFRESH_COOKIE);
	if (!refresh) return null;
	const decoded = verifyRefreshToken(refresh);
	if (!decoded) return null;

	const user = await getUserById({ id: decoded.userId });
	if (!user) return null;

	const payload: IJwtPayload = {
		userId: user._id.toString(),
		role: user.role,
		status: user.status,
	};
	const newTokens = mintTokens(payload);
	return {
		userId: payload.userId,
		role: payload.role,
		status: payload.status,
		refreshed: true,
		newTokens,
	};
}

export type AuthedHandler<TCtx = unknown> = (args: {
	req: NextRequest;
	auth: AuthResult;
	context: TCtx;
}) => Promise<Response> | Response;

export function withAuth<TCtx = unknown>(handler: AuthedHandler<TCtx>) {
	return async ({
		req,
		context,
	}: {
		req: NextRequest;
		context: TCtx;
	}): Promise<Response> => {
		const auth = await verifyAuth(req);
		if (!auth) throw ErrUnauthenticated;

		const res = (await handler({ req, auth, context })) as NextResponse;
		if (auth.refreshed && auth.newTokens && "cookies" in res) {
			setAuthCookies(res as NextResponse, auth.newTokens);
		}
		return res;
	};
}

export function withRole<TCtx = unknown>(
	roles: UserRole[],
	handler: AuthedHandler<TCtx>,
) {
	return withAuth<TCtx>(async (args) => {
		if (!roles.includes(args.auth.role)) {
			throw ErrUnauthenticated;
		}
		return handler(args);
	});
}

export { clearAuthCookies, setAuthCookies };
