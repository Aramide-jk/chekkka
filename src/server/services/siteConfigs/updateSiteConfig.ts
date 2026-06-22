import "server-only";
import {
	type ISiteConfigData,
	type SiteConfigPatch,
	updateSiteConfigDB,
} from "@/server/models/siteConfigs";
import recordAuditLog from "../adminAuditLogs/recordAuditLog";
import getSiteConfig from "./getSiteConfig";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export interface IUpdateSiteConfigInput {
	patch: SiteConfigPatch;
	actor: {
		userId: string;
		email?: string;
	};
	request?: {
		ip?: string;
		userAgent?: string;
	};
}

/**
 * Admin write path. Snapshots the current resolved config (for the audit
 * diff), persists the patch, invalidates every cache layer, and logs the
 * change to `adminAuditLogs`.
 */
export default async function updateSiteConfig({
	patch,
	actor,
	request,
}: IUpdateSiteConfigInput): Promise<ISiteConfigData> {
	const before = await getSiteConfig({ refreshCache: true });

	await updateSiteConfigDB({ patch, updatedBy: actor.userId });
	await invalidateCacheKeys();

	const after = await getSiteConfig({ refreshCache: true });

	await recordAuditLog({
		actorId: actor.userId,
		actorEmail: actor.email,
		action: "site_config.update",
		target: "site_config",
		before: diffOf(before, patch),
		after: diffOf(after, patch),
		ip: request?.ip,
		userAgent: request?.userAgent,
	}).catch(() => undefined);

	return after;
}

// Trim the audit payload down to just the fields the admin actually touched,
// so the log is greppable and doesn't carry stale fields forever.
function diffOf(
	full: ISiteConfigData,
	patch: SiteConfigPatch,
): Record<string, unknown> {
	const out: Record<string, Record<string, unknown>> = {};
	for (const [section, values] of Object.entries(patch)) {
		if (!values || typeof values !== "object") continue;
		const slice = (
			full as unknown as Record<string, Record<string, unknown>>
		)[section];
		if (!slice) continue;
		const picked: Record<string, unknown> = {};
		for (const k of Object.keys(values)) picked[k] = slice[k];
		out[section] = picked;
	}
	return out;
}
