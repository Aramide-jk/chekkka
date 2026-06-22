import "server-only";
import crypto from "node:crypto";
import { ErrEmailAlreadyExists } from "@/server/constants/errors";
import { isValidPermission, type Permission } from "@/server/lib/permissions";
import { getUserByEmailDB } from "@/server/models/users";
import recordAuditLog from "../adminAuditLogs/recordAuditLog";
import emitNotification from "../notifications/emitNotification";
import createUser from "../users/createUser";
import { type IManagerSummary, toManagerSummary } from "./listManagers";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

// 7-day acceptance window. Matches the order of magnitude of typical SaaS
// invite expiries — long enough to survive a weekend, short enough that a
// leaked token doesn't linger.
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface ICreateManagerInput {
	fullName: string;
	username: string;
	email: string;
	phone?: string;
	// Optional starter permission set. Defaults to [] — zero access — per the
	// "managers start with zero access" requirement. Admins can pre-stage
	// permissions at create time but the manager still can't USE them until
	// they accept the invite (status is `pending` until then).
	permissions?: Permission[];
	actor: { userId: string; email?: string };
	request?: { ip?: string; userAgent?: string };
}

export interface ICreateManagerResult {
	manager: IManagerSummary;
	// Single-use bearer token for the /invite/<token> page. Returned ONCE on
	// create (and on resend). We never expose it via the manager list so a
	// later admin can't steal an outstanding invite without rotating it.
	inviteToken: string;
	inviteTokenExpiresAt: Date;
	invitePath: string;
}

function mintInviteToken(): {
	token: string;
	expiresAt: Date;
} {
	// 256 bits of entropy = brute-force safe even without rate limiting.
	const token = crypto.randomBytes(32).toString("hex");
	return { token, expiresAt: new Date(Date.now() + INVITE_TTL_MS) };
}

/**
 * Create a manager in `pending` state and mint a single-use invite token.
 * The manager cannot log in until they accept via /invite/<token>, which
 * collects their password and flips status to `active`.
 */
export default async function createManager(
	input: ICreateManagerInput,
): Promise<ICreateManagerResult> {
	const existing = await getUserByEmailDB(input.email);
	if (existing) throw ErrEmailAlreadyExists;

	// Hard-filter to known permissions so a typo doesn't silently grant nothing
	// the manager can use (or, worse, get persisted unchecked).
	const safePermissions = (input.permissions ?? []).filter(isValidPermission);

	const { token, expiresAt } = mintInviteToken();

	const user = await createUser({
		payload: {
			fullName: input.fullName,
			username: input.username,
			email: input.email,
			phone: input.phone,
			// No password until accept — set on /invite/<token>/accept.
			role: "manager",
			status: "pending",
			permissions: safePermissions,
			onboardingCompleted: true,
			inviteToken: token,
			invitedAt: new Date(),
			inviteTokenExpiresAt: expiresAt,
		},
	});

	await invalidateCacheKeys({ managerId: user._id.toString() });

	// In production this would dispatch an email containing the invite URL.
	// For now we record an in-app notification (the existing emit pattern)
	// and return the URL to the admin caller so they can copy/paste it. The
	// admin UI also surfaces it once on success.
	await emitNotification({
		userId: user._id.toString(),
		kind: "manager.invite.sent",
		title: "Welcome to Chekka",
		body: "An admin invited you as a manager. Open the link to set your password.",
		link: `/invite/${token}`,
	}).catch(() => undefined);

	await recordAuditLog({
		actorId: input.actor.userId,
		actorEmail: input.actor.email,
		action: "manager.invite",
		target: user._id.toString(),
		after: {
			email: user.email,
			permissions: safePermissions,
			inviteTokenExpiresAt: expiresAt.toISOString(),
		},
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
