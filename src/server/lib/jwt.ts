import "server-only";
import jwt from "jsonwebtoken";
import {
	ACCESS_TOKEN_MAX_AGE_SECONDS,
	JWT_ACCESS_TOKEN_SECRET,
	JWT_REFRESH_TOKEN_SECRET,
	REFRESH_TOKEN_MAX_AGE_SECONDS,
} from "../constants";
import type { UserRole } from "../types";

export interface IJwtPayload {
	userId: string;
	role: UserRole;
	status: string;
}

const ACCESS_SECRET = JWT_ACCESS_TOKEN_SECRET || "dev-access-secret-do-not-use";
const REFRESH_SECRET =
	JWT_REFRESH_TOKEN_SECRET || "dev-refresh-secret-do-not-use";

export function signAccessToken(payload: IJwtPayload): string {
	return jwt.sign(payload, ACCESS_SECRET, {
		expiresIn: ACCESS_TOKEN_MAX_AGE_SECONDS,
	});
}

export function signRefreshToken(payload: IJwtPayload): string {
	return jwt.sign(payload, REFRESH_SECRET, {
		expiresIn: REFRESH_TOKEN_MAX_AGE_SECONDS,
	});
}

export function verifyAccessToken(token: string): IJwtPayload | null {
	try {
		return jwt.verify(token, ACCESS_SECRET) as IJwtPayload;
	} catch {
		return null;
	}
}

export function verifyRefreshToken(token: string): IJwtPayload | null {
	try {
		return jwt.verify(token, REFRESH_SECRET) as IJwtPayload;
	} catch {
		return null;
	}
}

export function mintTokens(payload: IJwtPayload) {
	return {
		accessToken: signAccessToken(payload),
		refreshToken: signRefreshToken(payload),
	};
}
