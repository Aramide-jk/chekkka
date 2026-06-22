import "server-only";
import { invalidateManagerPermissions } from "@/server/lib/permissions";
import invalidateUserCacheKeys from "@/server/services/users/utils/invalidateCacheKeys";

/**
 * Single-stop cache reset for every layer that depends on a manager's
 * permissions or the manager list. Called after every create / update /
 * delete in the managers service so admin writes show up immediately in the
 * UI and on the very next API call from that manager's session.
 *
 * MUST be awaited — the Redis-layer deletes are async and the immediate next
 * request from the affected manager would otherwise hit a stale cache entry.
 *
 * Three things to clear:
 *   1. The manager-permission lookup cache (`getManagerPermissions`).
 *   2. The underlying `getUserById` cache — its 24h Redis TTL would otherwise
 *      keep returning the stale user document (and its stale `permissions`)
 *      for the permissions lookup's loader.
 *   3. `listUsersByRole` so the admin's roster page reflects the change.
 */
export default async function invalidateCacheKeys({
	managerId,
}: {
	managerId?: string;
} = {}): Promise<void> {
	if (managerId) {
		await invalidateManagerPermissions(managerId);
		await invalidateUserCacheKeys({ id: managerId });
	}
}
