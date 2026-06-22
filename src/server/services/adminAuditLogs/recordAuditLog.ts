import "server-only";
import type { Types } from "mongoose";
import {
	createAdminAuditLogDB,
	type IAdminAuditLog,
} from "@/server/models/adminAuditLogs";
import getSiteConfig from "../siteConfigs/getSiteConfig";

export interface IRecordAuditLogInput {
	actorId: string;
	actorEmail?: string;
	action: string;
	target?: string;
	before?: Record<string, unknown>;
	after?: Record<string, unknown>;
	ip?: string;
	userAgent?: string;
}

/**
 * Fire-and-forget audit logger. Returns null if logging is disabled by
 * site config so callers can chain `.catch(() => undefined)` without
 * worrying about the write failing the parent operation.
 */
export default async function recordAuditLog(
	payload: IRecordAuditLogInput,
): Promise<IAdminAuditLog | null> {
	const config = await getSiteConfig().catch(() => null);
	if (config && !config.audit.adminAuditEnabled) return null;

	return createAdminAuditLogDB({
		actorId: payload.actorId as unknown as Types.ObjectId,
		actorEmail: payload.actorEmail,
		action: payload.action,
		target: payload.target,
		before: payload.before,
		after: payload.after,
		ip: payload.ip,
		userAgent: payload.userAgent,
	});
}
