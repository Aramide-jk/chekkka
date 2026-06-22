import "server-only";
import { ErrForbidden } from "../constants/errors";
import { makeInProcessCache, withDualLayerCache } from "../services/_cache";
import { getUserById } from "../services/users";
import type { UserRole } from "../types";
import type { AuthedHandler, AuthResult } from "./auth";
import { withAuth } from "./auth";

// ─────────────────────────────────────────────────────────────────────────────
// Granular permissions for the `manager` role.
//
// The contract: a manager defaults to ZERO access. The admin grants individual
// permission strings from this catalogue. The catalogue is the source of truth
// — every permission referenced by a route must appear here, and the manager
// UI renders directly from this list so a new permission auto-appears.
//
// `admin` users always pass every permission check; their permission list is
// implicit, not stored.
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_PERMISSIONS = [
	"inspectors.view",
	"inspectors.approve",
	"special_requests.view",
	"live.view",
	"disputes.view",
	"disputes.resolve",
	"broker_requests.view",
	"overdue.view",
	"site_config.view",
	"site_config.edit",
	"audit.view",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

// Human-readable copy for the admin UI. Keep keys aligned with ALL_PERMISSIONS.
export const PERMISSION_LABELS: Record<Permission, string> = {
	"inspectors.view": "View inspector applications",
	"inspectors.approve": "Approve / reject inspectors",
	"special_requests.view": "View special requests",
	"live.view": "View live inspections",
	"disputes.view": "View disputes",
	"disputes.resolve": "Resolve disputes",
	"broker_requests.view": "View broker requests",
	"overdue.view": "View overdue reports",
	"site_config.view": "View site settings",
	"site_config.edit": "Edit site settings",
	"audit.view": "View audit log",
};

export function isValidPermission(value: unknown): value is Permission {
	return (
		typeof value === "string" &&
		(ALL_PERMISSIONS as readonly string[]).includes(value)
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission lookup with a short cache.
//
// The JWT only carries `{ userId, role, status }`. Manager permissions live on
// the user row and can change on every admin grant/revoke, so we DON'T embed
// them in the token (we'd otherwise have to force-rotate sessions on every
// permission edit). Instead we read them on demand and cache for 15 s — that's
// short enough for admin changes to propagate to a tab on the next request,
// and long enough that the hot path is effectively free.
//
// `invalidate(userId)` is called by the managers service after every write so
// changes are visible immediately within the writing instance.
// ─────────────────────────────────────────────────────────────────────────────

const memo = makeInProcessCache<string[]>();

function redisKey(userId: string): string {
	return `services:managers:permissions:${userId}`;
}

export async function getManagerPermissions(userId: string): Promise<string[]> {
	const cached = await withDualLayerCache<string[]>({
		memo,
		memoKey: userId,
		redisKey: redisKey(userId),
		redisTtlSeconds: 15,
		loader: async () => {
			const user = await getUserById({ id: userId }).catch(() => null);
			if (!user || user.role !== "manager") return [];
			return user.permissions ?? [];
		},
	});
	return cached ?? [];
}

export async function invalidateManagerPermissions(
	userId: string,
): Promise<void> {
	memo.clear(userId);
	// We MUST await the Redis delete: the immediate next request from the
	// manager would otherwise read stale Redis-cached permissions. Lazy
	// require to avoid pulling the redis module into the lib barrel at load
	// time.
	const { redisDeleteKeys } = await import("../databases/redis");
	await redisDeleteKeys(redisKey(userId)).catch(() => undefined);
}

// ─────────────────────────────────────────────────────────────────────────────
// Authorisation primitives
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve whether `auth` may act under the given permission string.
 *
 * - `admin` → always true (superuser)
 * - `manager` → true iff the permission is in their explicit list
 * - any other role → false (buyers, inspectors, consultants are never admins)
 */
export async function hasPermission(
	auth: Pick<AuthResult, "userId" | "role">,
	permission: Permission,
): Promise<boolean> {
	if (auth.role === "admin") return true;
	if (auth.role !== "manager") return false;
	const perms = await getManagerPermissions(auth.userId);
	return perms.includes(permission);
}

/**
 * Wraps an authed handler with a single-permission gate. 403s if the caller
 * doesn't qualify, after running `withAuth` (which 401s anonymous callers).
 * Use this on every admin-tools endpoint that should be delegatable to
 * a manager.
 */
export function withPermission<TCtx = unknown>(
	permission: Permission,
	handler: AuthedHandler<TCtx>,
) {
	return withAuth<TCtx>(async (args) => {
		const ok = await hasPermission(args.auth, permission);
		if (!ok) throw ErrForbidden;
		return handler(args);
	});
}

/**
 * Variant for endpoints that need ANY of a set of permissions (e.g. a "view"
 * permission OR the corresponding "edit" permission grants read access).
 */
export function withAnyPermission<TCtx = unknown>(
	permissions: Permission[],
	handler: AuthedHandler<TCtx>,
) {
	return withAuth<TCtx>(async (args) => {
		for (const p of permissions) {
			if (await hasPermission(args.auth, p)) return handler(args);
		}
		throw ErrForbidden;
	});
}

/**
 * For the rare endpoint that requires admin specifically (e.g. /api/admin/
 * managers — only admins can mint or grant). Distinct from withPermission so
 * intent is loud at the call site.
 */
export function withAdmin<TCtx = unknown>(handler: AuthedHandler<TCtx>) {
	return withAuth<TCtx>(async (args) => {
		if (args.auth.role !== "admin") throw ErrForbidden;
		return handler(args);
	});
}

// Re-export the role/permission alphabet so callers can grab them in one go.
export type { UserRole };
