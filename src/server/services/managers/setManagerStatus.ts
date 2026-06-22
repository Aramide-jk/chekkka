import "server-only";
import { ErrNotFound } from "@/server/constants/errors";
import { type IUser, updateUserDB } from "@/server/models/users";
import recordAuditLog from "../adminAuditLogs/recordAuditLog";
import getUserById from "../users/getUserById";
import { type IManagerSummary, toManagerSummary } from "./listManagers";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export type ManagerStatusAction = "suspend" | "reactivate";

const STATUS_BY_ACTION: Record<ManagerStatusAction, IUser["status"]> = {
	suspend: "suspended",
	reactivate: "active",
};

/**
 * Soft enable/disable for a manager. We don't delete the row — the audit
 * trail and permission diffs need to remain queryable — but a suspended
 * manager is locked out at the auth layer (existing behaviour for any
 * suspended user).
 */
export default async function setManagerStatus(input: {
	managerId: string;
	action: ManagerStatusAction;
	actor: { userId: string; email?: string };
	request?: { ip?: string; userAgent?: string };
}): Promise<IManagerSummary> {
	const current = await getUserById({ id: input.managerId });
	if (!current || current.role !== "manager") throw ErrNotFound;

	const next = STATUS_BY_ACTION[input.action];
	const updated = await updateUserDB(input.managerId, { status: next });
	if (!updated) throw ErrNotFound;

	await invalidateCacheKeys({ managerId: input.managerId });

	await recordAuditLog({
		actorId: input.actor.userId,
		actorEmail: input.actor.email,
		action: `manager.${input.action}`,
		target: input.managerId,
		before: { status: current.status },
		after: { status: next },
		ip: input.request?.ip,
		userAgent: input.request?.userAgent,
	}).catch(() => undefined);

	return toManagerSummary(updated);
}
