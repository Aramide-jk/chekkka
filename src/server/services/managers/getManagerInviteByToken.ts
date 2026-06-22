import "server-only";
import { getUserByInviteTokenDB, type IUser } from "@/server/models/users";

export interface IInvitePreview {
	email: string;
	fullName: string;
	expiresAt: Date;
	// True iff token is still openable (not expired, not consumed).
	openable: boolean;
}

/**
 * Look up a manager invite by its public token. Returns ONLY the safe-to-show
 * fields — no permissions, no id, no audit trail — so the public-facing
 * /invite/<token> page can render a welcome screen without exposing internal
 * state to an unauthenticated caller.
 *
 * Returns `null` if the token doesn't match any manager. Returns a preview
 * with `openable=false` if the manager is no longer pending (already accepted,
 * rejected, suspended) or the token has expired.
 */
export default async function getManagerInviteByToken(
	token: string,
): Promise<IInvitePreview | null> {
	if (!token || typeof token !== "string") return null;

	const user: IUser | null = await getUserByInviteTokenDB(token);
	if (!user || user.role !== "manager") return null;

	const now = Date.now();
	const expiresAt = user.inviteTokenExpiresAt ?? new Date(0);
	const openable =
		user.status === "pending" &&
		!user.inviteAcceptedAt &&
		!user.inviteRejectedAt &&
		expiresAt.getTime() > now;

	return {
		email: user.email,
		fullName: user.fullName,
		expiresAt,
		openable,
	};
}
