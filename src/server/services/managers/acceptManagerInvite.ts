import "server-only";
import {
	ErrInvalidAction,
	ErrInvalidFields,
	ErrNotFound,
} from "@/server/constants/errors";
import { User } from "@/server/models/users";
import recordAuditLog from "../adminAuditLogs/recordAuditLog";
import invalidateUsersCacheKeys from "../users/utils/invalidateCacheKeys";
import { type IManagerSummary, toManagerSummary } from "./listManagers";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export interface IAcceptManagerInviteInput {
	token: string;
	password: string;
	request?: { ip?: string; userAgent?: string };
}

export interface IAcceptManagerInviteResult {
	manager: IManagerSummary;
	userId: string;
}

/**
 * Consume a manager invite: set the password, flip the status to `active`,
 * stamp `inviteAcceptedAt`, and CLEAR the token so it can't be reused. The
 * password gets hashed by the pre-save hook on the User model.
 *
 * Throws on any path that would let a stale or reused token through:
 *  - unknown token → ErrNotFound
 *  - expired / already-accepted / already-rejected → ErrInvalidAction
 */
export default async function acceptManagerInvite(
	input: IAcceptManagerInviteInput,
): Promise<IAcceptManagerInviteResult> {
	if (!input.token || typeof input.token !== "string") {
		throw ErrNotFound;
	}
	if (!input.password || input.password.length < 8) {
		throw ErrInvalidFields;
	}

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

	user.password = input.password; // hashed by the pre-save hook
	user.status = "active";
	user.inviteAcceptedAt = new Date();
	user.inviteToken = undefined; // single-use — clear so it can't be reused
	user.inviteTokenExpiresAt = undefined;
	await user.save();

	const id = user._id.toString();
	await invalidateUsersCacheKeys({
		id,
		email: user.email,
		username: user.username,
	}).catch(() => undefined);
	await invalidateCacheKeys({ managerId: id }).catch(() => undefined);

	// Self-acted (no admin actor), so the audit row records the manager as
	// the actor — useful for incident review even though it's unusual.
	await recordAuditLog({
		actorId: id,
		actorEmail: user.email,
		action: "manager.invite.accept",
		target: id,
		after: { status: "active" },
		ip: input.request?.ip,
		userAgent: input.request?.userAgent,
	}).catch(() => undefined);

	return { manager: toManagerSummary(user), userId: id };
}
