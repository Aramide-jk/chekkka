import "server-only";
import { ErrUserNotFound } from "@/server/constants/errors";
import type { IUser, UserStatus } from "@/server/models/users";
import { listPendingApplications } from "../inspectorProfiles";
import invalidateInspectorProfilesCacheKeys from "../inspectorProfiles/utils/invalidateCacheKeys";
import emitNotification from "../notifications/emitNotification";
import updateUser from "../users/updateUser";

const NOTIF_BY_ACTION: Record<
	"approve" | "reject" | "suspend" | "reactivate",
	{ kind: string; title: string; body: string }
> = {
	approve: {
		kind: "inspector.application.approved",
		title: "Application approved",
		body: "Welcome to Chekka — you can start accepting jobs.",
	},
	reject: {
		kind: "inspector.application.rejected",
		title: "Application not approved",
		body: "Your inspector application was not approved at this time.",
	},
	suspend: {
		kind: "inspector.account.suspended",
		title: "Account suspended",
		body: "Your inspector account has been suspended. Contact support.",
	},
	reactivate: {
		kind: "inspector.account.reactivated",
		title: "Account reactivated",
		body: "Your inspector account is active again.",
	},
};

const STATUS_BY_ACTION: Record<
	"approve" | "reject" | "suspend" | "reactivate",
	UserStatus
> = {
	approve: "approved",
	reject: "rejected",
	suspend: "suspended",
	reactivate: "approved",
};

export type AdminInspectorAction = keyof typeof NOTIF_BY_ACTION;

export default async function setInspectorStatus({
	userId,
	action,
}: {
	userId: string;
	action: AdminInspectorAction;
}): Promise<IUser> {
	const user = await updateUser({
		id: userId,
		payload: { status: STATUS_BY_ACTION[action] },
	});
	if (!user) throw ErrUserNotFound;

	// The pending-applications view depends on the joined user status.
	await invalidateInspectorProfilesCacheKeys({ userId });
	// Touching the pending list cache via inspector-profiles invalidation above
	// already drops the list; this is a deliberate noop seam in case other
	// downstream caches rely on the action in the future.
	void listPendingApplications;

	const meta = NOTIF_BY_ACTION[action];
	await emitNotification({
		userId,
		kind: meta.kind,
		title: meta.title,
		body: meta.body,
		link: "/inspector",
	}).catch(() => undefined);

	return user;
}
