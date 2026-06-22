"use client";

import type { ISessionUser } from "@/types";
import api from "./api";

/**
 * Probes `/api/auth/session` to confirm the cookie-based session is still
 * valid. Returns the session user when signed in, or null otherwise.
 */
export default async function verifyUserLogin({
	cookieHeader,
}: {
	cookieHeader: string;
}): Promise<ISessionUser | null> {
	if (!cookieHeader) return null;
	try {
		const res = await api().get("/api/auth/session");
		if (res.status !== 200) return null;
		const user = res.data?.data?.user;
		return user ? (user as ISessionUser) : null;
	} catch {
		return null;
	}
}
