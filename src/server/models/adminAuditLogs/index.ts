import "server-only";
import mongoose, { type Document, Schema } from "mongoose";
import {
	databaseResponseTimeHistogram,
	IOperationType,
} from "@/server/metrics";

// Append-only change trail for every admin mutation. Modelled on the gkoi
// `admin-audit-logs` collection — TTL-indexed, populated by services on the
// write path (no middleware here, the codebase is small enough).
export interface IAdminAuditLog extends Document {
	_id: mongoose.Types.ObjectId;
	actorId: mongoose.Types.ObjectId;
	actorEmail?: string;
	action: string;
	target?: string;
	before?: Record<string, unknown>;
	after?: Record<string, unknown>;
	ip?: string;
	userAgent?: string;
	createdAt: Date;
}

const schema = new Schema<IAdminAuditLog>(
	{
		actorId: {
			type: Schema.Types.ObjectId,
			ref: "users",
			required: true,
			index: true,
		},
		actorEmail: { type: String },
		action: { type: String, required: true, index: true },
		target: { type: String },
		before: { type: Schema.Types.Mixed },
		after: { type: Schema.Types.Mixed },
		ip: { type: String },
		userAgent: { type: String },
	},
	{ timestamps: { createdAt: true, updatedAt: false } },
);

// Default 90-day TTL — the configured retention window is read at insert
// time (see `services/adminAuditLogs/recordAuditLog.ts`).
schema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

const COLLECTION = "adminauditlogs";
export const AdminAuditLog =
	(mongoose.models[COLLECTION] as mongoose.Model<IAdminAuditLog>) ||
	mongoose.model<IAdminAuditLog>(COLLECTION, schema);

function timer(method: string, op: IOperationType = IOperationType.Read) {
	return databaseResponseTimeHistogram.startTimer({
		operation: op,
		collection: COLLECTION,
		method,
	});
}

export async function createAdminAuditLogDB(
	payload: Partial<IAdminAuditLog>,
): Promise<IAdminAuditLog> {
	const stop = timer("createAdminAuditLogDB", IOperationType.Create);
	const doc = await AdminAuditLog.create(payload);
	stop({ success: "true" });
	return doc;
}

export async function listAdminAuditLogsDB({
	limit = 50,
	offset = 0,
	action,
	actorId,
}: {
	limit?: number;
	offset?: number;
	action?: string;
	actorId?: string;
} = {}): Promise<IAdminAuditLog[]> {
	const stop = timer("listAdminAuditLogsDB");
	const query: Record<string, unknown> = {};
	if (action) query.action = action;
	if (actorId) query.actorId = actorId;
	const items = await AdminAuditLog.find(query)
		.sort({ createdAt: -1 })
		.skip(offset)
		.limit(Math.min(limit, 200))
		.lean<IAdminAuditLog[]>()
		.exec();
	stop({ success: "true" });
	return items;
}
