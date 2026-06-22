import "server-only";
import type { NextRequest } from "next/server";
import type { AuthResult } from "@/server/lib/auth";
import { verifyAuth } from "@/server/lib/auth";
import type { IUser } from "@/server/models/users";
import getUserById from "../users/getUserById";

export interface ISessionResult {
	user: IUser;
	auth: AuthResult;
}

/**
 * Resolves the current request's session: validates tokens and loads the
 * caller's user record via the cached `getUserById` service. Returns null
 * when the request is not signed in.
 */
export default async function getSession({
	req,
}: {
	req: NextRequest;
}): Promise<ISessionResult | null> {
	const auth = await verifyAuth(req);
	if (!auth) return null;

	const user = await getUserById({ id: auth.userId });
	if (!user) return null;

	return { user, auth };
}
