import "server-only";
import { ErrInvalidAction, ErrNotFound } from "@/server/constants/errors";
import { User } from "@/server/models/users";
import recordAuditLog from "../adminAuditLogs/recordAuditLog";
import { type IManagerSummary, toManagerSummary } from "./listManagers";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export interface IRejectManagerInviteInput {
	token: string;
	request?: { ip?: string; userAgent?: string };
}

/**
 * Mark an outstanding manager invite as rejected. Status moves to `rejected`,
 * the token is cleared (single-use), and the row is left in place for the
 * audit trail. Admin can re-invite later via the resend endpoint, which
 * generates a fresh token if the previous one was rejected or expired.
 */
export default async function rejectManagerInvite(
	input: IRejectManagerInviteInput,
): Promise<IManagerSummary> {
	if (!input.token || typeof input.token !== "string") throw ErrNotFound;

	const user = await User.findOne({
		inviteToken: input.token,
		deleted: false,
	}).exec();
	if (!user || user.role !== "manager") throw ErrNotFound;

	const expiresAt = user.inviteTokenExpiresAt?.getTime() ?? 0;
	if (expiresAt <= Date.now()) throw ErrInvalidAction;
	if (user.inviteAcceptedAt || user.inviteRejectedAt) {
		throw ErrInvalidAction;
	}
	if (user.status !== "pending") throw ErrInvalidAction;

	user.status = "rejected";
	user.inviteRejectedAt = new Date();
	user.inviteToken = undefined;
	user.inviteTokenExpiresAt = undefined;
	await user.save();

	const id = user._id.toString();
	await invalidateCacheKeys({ managerId: id }).catch(() => undefined);

	await recordAuditLog({
		actorId: id,
		actorEmail: user.email,
		action: "manager.invite.reject",
		target: id,
		after: { status: "rejected" },
		ip: input.request?.ip,
		userAgent: input.request?.userAgent,
	}).catch(() => undefined);

	return toManagerSummary(user);
}
