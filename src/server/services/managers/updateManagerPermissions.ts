import "server-only";
import { ErrInvalidAction, ErrNotFound } from "@/server/constants/errors";
import { isValidPermission, type Permission } from "@/server/lib/permissions";
import { updateUserDB } from "@/server/models/users";
import recordAuditLog from "../adminAuditLogs/recordAuditLog";
import getUserById from "../users/getUserById";
import { type IManagerSummary, toManagerSummary } from "./listManagers";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export interface IUpdateManagerPermissionsInput {
	managerId: string;
	// Full replacement set — easier for the UI than diff lists, and the
	// audit-log diff is computed from before/after below.
	permissions: Permission[];
	actor: { userId: string; email?: string };
	request?: { ip?: string; userAgent?: string };
}

/**
 * Replace a manager's permission set wholesale. Admin-only. Records an
 * audit entry with the before/after diff and clears the permission cache so
 * the manager's next API call reflects the change.
 */
export default async function updateManagerPermissions(
	input: IUpdateManagerPermissionsInput,
): Promise<IManagerSummary> {
	const current = await getUserById({ id: input.managerId });
	if (!current || current.role !== "manager") throw ErrNotFound;

	// Pending invites have no password and the manager has never confirmed
	// their account. Granting permissions to a pending row would mean those
	// permissions get applied the instant the invite is accepted, which is
	// the OPPOSITE of "managers start with zero access". Force the admin to
	// wait until the manager accepts before granting anything.
	if (current.status === "pending") throw ErrInvalidAction;
	// Rejected accounts shouldn't accumulate permissions either — they're a
	// terminal state until the admin resends an invite.
	if (current.status === "rejected") throw ErrInvalidAction;

	const safe = Array.from(
		new Set(input.permissions.filter(isValidPermission)),
	);
	const before = current.permissions ?? [];

	const updated = await updateUserDB(input.managerId, {
		permissions: safe,
	});
	if (!updated) throw ErrNotFound;

	await invalidateCacheKeys({ managerId: input.managerId });

	const beforeSet = new Set<string>(before);
	const afterSet = new Set<string>(safe);
	const granted = safe.filter((p) => !beforeSet.has(p));
	const revoked = before.filter((p) => !afterSet.has(p));
	if (granted.length > 0 || revoked.length > 0) {
		await recordAuditLog({
			actorId: input.actor.userId,
			actorEmail: input.actor.email,
			action: "manager.permissions.update",
			target: input.managerId,
			before: { permissions: before },
			after: { permissions: safe, granted, revoked },
			ip: input.request?.ip,
			userAgent: input.request?.userAgent,
		}).catch(() => undefined);
	}

	return toManagerSummary(updated);
}
