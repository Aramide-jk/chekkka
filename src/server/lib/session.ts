import "server-only";
import type { NextResponse } from "next/server";
import type { IUser } from "../models/users";
import { setAuthCookies } from "./cookies";
import { type IJwtPayload, mintTokens } from "./jwt";

export interface ISessionUser {
	id: string;
	fullName: string;
	username: string;
	email: string;
	phone?: string;
	role: IUser["role"];
	status: IUser["status"];
	avatar?: string;
	city?: string;
	onboardingCompleted: boolean;
	// Only populated for `manager` role; empty array for everyone else. Admins
	// don't need it (they have implicit full access via `hasPermission`).
	permissions?: string[];
}

export function toSessionUser(u: IUser): ISessionUser {
	return {
		id: u._id.toString(),
		fullName: u.fullName,
		username: u.username,
		email: u.email,
		phone: u.phone,
		role: u.role,
		status: u.status,
		avatar: u.avatar,
		city: u.city,
		onboardingCompleted: u.onboardingCompleted,
		permissions: u.role === "manager" ? (u.permissions ?? []) : undefined,
	};
}

export function attachSession(res: NextResponse, user: IUser): NextResponse {
	const payload: IJwtPayload = {
		userId: user._id.toString(),
		role: user.role,
		status: user.status,
	};
	setAuthCookies(res, mintTokens(payload));
	return res;
}
