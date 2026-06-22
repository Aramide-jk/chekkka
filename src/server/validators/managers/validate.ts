import { z } from "zod";
import { ALL_PERMISSIONS, type Permission } from "@/server/lib/permissions";

// Permission enum sourced directly from the runtime catalogue so Zod and the
// TypeScript Permission union stay in lock-step. A new permission added to
// ALL_PERMISSIONS becomes acceptable here automatically.
const permissionEnum = z.enum(
	ALL_PERMISSIONS as unknown as readonly [Permission, ...Permission[]],
);

export const createManagerBodySchema = z
	.object({
		fullName: z.string().trim().min(1).max(120),
		username: z.string().trim().min(2).max(40),
		email: z.string().email().max(120),
		phone: z.string().trim().min(4).max(40).optional(),
		// Password is no longer collected at admin-create time — the manager
		// sets their own on invite acceptance. Accepted in the schema for a
		// short backwards-compatibility window (ignored server-side) so the
		// previous admin UI can keep posting without 400s.
		password: z.string().min(8).max(200).optional(),
		permissions: z
			.array(permissionEnum)
			.max(ALL_PERMISSIONS.length)
			.optional(),
	})
	.strict();

export const updateManagerPermissionsBodySchema = z
	.object({
		permissions: z.array(permissionEnum).max(ALL_PERMISSIONS.length),
	})
	.strict();

export const setManagerStatusBodySchema = z
	.object({
		action: z.enum(["suspend", "reactivate"]),
	})
	.strict();

export const acceptManagerInviteBodySchema = z
	.object({
		password: z.string().min(8).max(200),
	})
	.strict();

export type CreateManagerBody = z.infer<typeof createManagerBodySchema>;
export type UpdateManagerPermissionsBody = z.infer<
	typeof updateManagerPermissionsBodySchema
>;
export type SetManagerStatusBody = z.infer<typeof setManagerStatusBodySchema>;
export type AcceptManagerInviteBody = z.infer<
	typeof acceptManagerInviteBodySchema
>;
