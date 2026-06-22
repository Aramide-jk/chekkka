import "server-only";
import {
	type IAdminAuditLog,
	listAdminAuditLogsDB,
} from "@/server/models/adminAuditLogs";

export default async function listAuditLogs({
	limit,
	offset,
	action,
	actorId,
}: {
	limit?: number;
	offset?: number;
	action?: string;
	actorId?: string;
} = {}): Promise<IAdminAuditLog[]> {
	return listAdminAuditLogsDB({ limit, offset, action, actorId });
}
