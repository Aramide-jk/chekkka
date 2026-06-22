import "server-only";
import mongoose, { type Document, Schema } from "mongoose";
import {
	databaseResponseTimeHistogram,
	IOperationType,
} from "@/server/metrics";

export type DisputeStatus = "open" | "resolved" | "closed";
export type DisputeResolution = "buyer" | "inspector" | "closed" | null;

export interface IDispute extends Document {
	_id: mongoose.Types.ObjectId;
	inspectionId: mongoose.Types.ObjectId;
	raisedBy: mongoose.Types.ObjectId;
	statement: string;
	status: DisputeStatus;
	resolution: DisputeResolution;
	messages: Array<{ from: mongoose.Types.ObjectId; body: string; at: Date }>;
	internalNotes: Array<{
		from: mongoose.Types.ObjectId;
		body: string;
		at: Date;
	}>;
	createdAt: Date;
	updatedAt: Date;
}

const schema = new Schema<IDispute>(
	{
		inspectionId: {
			type: Schema.Types.ObjectId,
			ref: "inspections",
			required: true,
			index: true,
		},
		raisedBy: {
			type: Schema.Types.ObjectId,
			ref: "users",
			required: true,
		},
		statement: { type: String, required: true },
		status: {
			type: String,
			enum: ["open", "resolved", "closed"],
			default: "open",
		},
		resolution: {
			type: String,
			enum: [null, "buyer", "inspector", "closed"],
			default: null,
		},
		messages: [Schema.Types.Mixed],
		internalNotes: [Schema.Types.Mixed],
	},
	{ timestamps: true },
);

const COLLECTION = "disputes";
export const Dispute =
	(mongoose.models[COLLECTION] as mongoose.Model<IDispute>) ||
	mongoose.model<IDispute>(COLLECTION, schema);

function timer(method: string, op: IOperationType = IOperationType.Read) {
	return databaseResponseTimeHistogram.startTimer({
		operation: op,
		collection: COLLECTION,
		method,
	});
}

export async function createDisputeDB(
	payload: Partial<IDispute>,
): Promise<IDispute> {
	const stop = timer("createDisputeDB", IOperationType.Create);
	const d = await Dispute.create(payload);
	stop({ success: "true" });
	return d;
}

export async function listDisputesDB(): Promise<IDispute[]> {
	const stop = timer("listDisputesDB");
	const items = await Dispute.find({}).sort({ createdAt: -1 }).exec();
	stop({ success: "true" });
	return items;
}

export async function countDisputesDB(
	filter: { status?: DisputeStatus } = {},
): Promise<number> {
	const stop = timer("countDisputesDB");
	const query: Record<string, unknown> = {};
	if (filter.status) query.status = filter.status;
	const n = await Dispute.countDocuments(query).exec();
	stop({ success: "true" });
	return n;
}

export async function getDisputeByIdDB(id: string): Promise<IDispute | null> {
	const stop = timer("getDisputeByIdDB");
	if (!mongoose.isValidObjectId(id)) {
		stop({ success: "false" });
		return null;
	}
	const d = await Dispute.findById(id).exec();
	stop({ success: "true" });
	return d;
}

export async function updateDisputeDB(
	id: string,
	patch: Partial<IDispute>,
): Promise<IDispute | null> {
	const stop = timer("updateDisputeDB", IOperationType.Update);
	const d = await Dispute.findOneAndUpdate(
		{ _id: id },
		{ $set: patch },
		{ new: true },
	).exec();
	stop({ success: "true" });
	return d;
}
