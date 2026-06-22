import "server-only";
import type { IUser } from "@/server/models/users";
import listUsersByRole from "../users/listUsersByRole";

export interface IManagerSummary {
	id: string;
	fullName: string;
	username: string;
	email: string;
	phone?: string;
	status: IUser["status"];
	permissions: string[];
	// Invite lifecycle. The token itself is NEVER returned in the list — only
	// to the admin who created the invite (single-shot). What we surface here
	// is just enough state for the UI to render "pending — expires in 3 days".
	invitedAt?: Date;
	inviteTokenExpiresAt?: Date;
	inviteAcceptedAt?: Date;
	inviteRejectedAt?: Date;
	hasOutstandingInvite: boolean;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Admin-only manager roster. Cached for 60 s by `listUsersByRole`; the
 * managers service's `invalidateCacheKeys` clears that cache on every write.
 */
export default async function listManagers({
	refreshCache,
}: {
	refreshCache?: boolean;
} = {}): Promise<IManagerSummary[]> {
	const users = await listUsersByRole({
		role: "manager",
		refreshCache,
		// Admin-only list — bounded by how many managers an org realistically
		// has. The previous 200-cap dropped older rows (including the seeded
		// manager) once the test suite accumulated enough fixtures.
		limit: 1000,
	});
	return users.map(toManagerSummary);
}

export function toManagerSummary(u: IUser): IManagerSummary {
	const now = Date.now();
	const hasOutstandingInvite =
		!!u.inviteToken &&
		!!u.inviteTokenExpiresAt &&
		u.inviteTokenExpiresAt.getTime() > now &&
		!u.inviteAcceptedAt &&
		!u.inviteRejectedAt;
	return {
		id: u._id.toString(),
		fullName: u.fullName,
		username: u.username,
		email: u.email,
		phone: u.phone,
		status: u.status,
		permissions: u.permissions ?? [],
		invitedAt: u.invitedAt,
		inviteTokenExpiresAt: u.inviteTokenExpiresAt,
		inviteAcceptedAt: u.inviteAcceptedAt,
		inviteRejectedAt: u.inviteRejectedAt,
		hasOutstandingInvite,
		createdAt: u.createdAt,
		updatedAt: u.updatedAt,
	};
}
