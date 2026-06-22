import "server-only";
import crypto from "node:crypto";
import { ErrInvalidAction, ErrNotFound } from "@/server/constants/errors";
import { User } from "@/server/models/users";
import recordAuditLog from "../adminAuditLogs/recordAuditLog";
import emitNotification from "../notifications/emitNotification";
import { type IManagerSummary, toManagerSummary } from "./listManagers";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface IResendManagerInviteInput {
	managerId: string;
	actor: { userId: string; email?: string };
	request?: { ip?: string; userAgent?: string };
}

export interface IResendManagerInviteResult {
	manager: IManagerSummary;
	inviteToken: string;
	inviteTokenExpiresAt: Date;
	invitePath: string;
}

/**
 * Mint a fresh invite token for a manager that has NOT yet accepted. Useful
 * if the original token expired or the manager lost the email. Refusing on
 * `active` accounts keeps this endpoint single-purpose — admins use the
 * password-reset flow if an active manager forgot their password.
 */
export default async function resendManagerInvite(
	input: IResendManagerInviteInput,
): Promise<IResendManagerInviteResult> {
	const user = await User.findOne({
		_id: input.managerId,
		deleted: false,
	}).exec();
	if (!user || user.role !== "manager") throw ErrNotFound;
	if (user.status === "active" || user.status === "suspended") {
		throw ErrInvalidAction;
	}

	const token = crypto.randomBytes(32).toString("hex");
	const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

	user.inviteToken = token;
	user.inviteTokenExpiresAt = expiresAt;
	user.invitedAt = new Date();
	// Clear any prior rejection so a resent invite is once again accept-able.
	user.inviteRejectedAt = undefined;
	user.status = "pending";
	await user.save();

	await invalidateCacheKeys({ managerId: user._id.toString() }).catch(
		() => undefined,
	);

	await emitNotification({
		userId: user._id.toString(),
		kind: "manager.invite.resent",
		title: "Your Chekka invite was resent",
		body: "An admin sent you a fresh invite — open the link to set your password.",
		link: `/invite/${token}`,
	}).catch(() => undefined);

	await recordAuditLog({
		actorId: input.actor.userId,
		actorEmail: input.actor.email,
		action: "manager.invite.resend",
		target: user._id.toString(),
		after: { inviteTokenExpiresAt: expiresAt.toISOString() },
		ip: input.request?.ip,
		userAgent: input.request?.userAgent,
	}).catch(() => undefined);

	return {
		manager: toManagerSummary(user),
		inviteToken: token,
		inviteTokenExpiresAt: expiresAt,
		invitePath: `/invite/${token}`,
	};
}
