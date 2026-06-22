import {
	ErrForbidden,
	ErrInvalidFields,
	ErrNotFound,
} from "@/server/constants/errors";
import { getClientIp, ok, withAdmin, withApiHandler } from "@/server/lib";
import {
	getManager,
	setManagerStatus,
	updateManagerPermissions,
} from "@/server/services/managers";
import { getUserById } from "@/server/services/users";
import {
	setManagerStatusBodySchema,
	updateManagerPermissionsBodySchema,
} from "@/server/validators/managers/validate";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiHandler<Ctx>(
	{
		route: "/api/admin/managers/:id",
		rateLimit: { windowMs: 60_000, maxRequests: 200 },
	},
	withAdmin<Ctx>(async ({ context }) => {
		const { id } = await context.params;
		const manager = await getManager({ id });
		if (!manager) throw ErrNotFound;
		return ok({ manager });
	}),
);

// PATCH — two distinct shapes, distinguished by the body:
//   { permissions: [...] } → replace the permission set
//   { action: "suspend" | "reactivate" } → toggle the active/suspended state
// Anything else is rejected. Admins can't demote themselves through this
// endpoint (the path takes a managerId, and an admin's role is `admin`, not
// `manager`, so the service-layer role-guard catches it).
export const PATCH = withApiHandler<Ctx>(
	{
		route: "/api/admin/managers/:id",
		rateLimit: { windowMs: 60_000, maxRequests: 60 },
	},
	withAdmin<Ctx>(async ({ req, auth, context }) => {
		const { id } = await context.params;
		const body = await req.json().catch(() => null);

		if (!body || typeof body !== "object") throw ErrInvalidFields;

		const actor = await getUserById({ id: auth.userId }).catch(() => null);
		const request = {
			ip: getClientIp(req),
			userAgent: req.headers.get("user-agent") ?? undefined,
		};

		if ("permissions" in body) {
			const parsed = updateManagerPermissionsBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;
			const manager = await updateManagerPermissions({
				managerId: id,
				permissions: parsed.data.permissions,
				actor: { userId: auth.userId, email: actor?.email },
				request,
			});
			return ok({ manager }, "Permissions updated");
		}

		if ("action" in body) {
			const parsed = setManagerStatusBodySchema.safeParse(body);
			if (!parsed.success) throw ErrInvalidFields;
			const manager = await setManagerStatus({
				managerId: id,
				action: parsed.data.action,
				actor: { userId: auth.userId, email: actor?.email },
				request,
			});
			return ok({ manager }, "Manager status updated");
		}

		throw ErrInvalidFields;
	}),
);

// DELETE is intentionally a 405 — preserve the audit trail. Use PATCH with
// `{ action: "suspend" }` to lock a manager out.
export const DELETE = withApiHandler<Ctx>(
	{
		route: "/api/admin/managers/:id",
		rateLimit: { windowMs: 60_000, maxRequests: 30 },
	},
	withAdmin<Ctx>(async () => {
		// Surface a clear 403 so callers know this is intentional, not a 404
		// to a missing route.
		throw ErrForbidden;
	}),
);
