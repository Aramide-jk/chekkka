import "server-only";
import mongoose, { type Document, Schema } from "mongoose";
import {
	databaseResponseTimeHistogram,
	IOperationType,
} from "@/server/metrics";

export type BrokerStatus =
	| "broker_assigned"
	| "negotiation"
	| "purchase_confirmed"
	| "payment_coordinated"
	| "in_transit"
	| "delivered";

export interface IBrokerRequest extends Document {
	_id: mongoose.Types.ObjectId;
	buyerId: mongoose.Types.ObjectId;
	brokerId?: mongoose.Types.ObjectId | null;
	inspectionId: mongoose.Types.ObjectId;
	budget: number;
	paymentMethod: string;
	deliveryAddress: string;
	instructions?: string;
	status: BrokerStatus | null;
	deleted: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const schema = new Schema<IBrokerRequest>(
	{
		buyerId: { type: Schema.Types.ObjectId, ref: "users", required: true },
		brokerId: { type: Schema.Types.ObjectId, ref: "users" },
		inspectionId: {
			type: Schema.Types.ObjectId,
			ref: "inspections",
			required: true,
		},
		budget: { type: Number, required: true },
		paymentMethod: { type: String, required: true },
		deliveryAddress: { type: String, required: true },
		instructions: String,
		status: {
			type: String,
			enum: [
				null,
				"broker_assigned",
				"negotiation",
				"purchase_confirmed",
				"payment_coordinated",
				"in_transit",
				"delivered",
			],
			default: null,
		},
		deleted: { type: Boolean, default: false, select: false },
	},
	{ timestamps: true },
);

const COLLECTION = "brokerrequests";
export const BrokerRequest =
	(mongoose.models[COLLECTION] as mongoose.Model<IBrokerRequest>) ||
	mongoose.model<IBrokerRequest>(COLLECTION, schema);

function timer(method: string, op: IOperationType = IOperationType.Read) {
	return databaseResponseTimeHistogram.startTimer({
		operation: op,
		collection: COLLECTION,
		method,
	});
}

export async function createBrokerRequestDB(
	payload: Partial<IBrokerRequest>,
): Promise<IBrokerRequest> {
	const stop = timer("createBrokerRequestDB", IOperationType.Create);
	const b = await BrokerRequest.create(payload);
	stop({ success: "true" });
	return b;
}

export async function listBrokerRequestsDB(): Promise<IBrokerRequest[]> {
	const stop = timer("listBrokerRequestsDB");
	const items = await BrokerRequest.find({ deleted: false })
		.sort({ createdAt: -1 })
		.exec();
	stop({ success: "true" });
	return items;
}

export async function countBrokerRequestsDB(
	filter: { pending?: boolean } = {},
): Promise<number> {
	const stop = timer("countBrokerRequestsDB");
	const query: Record<string, unknown> = { deleted: false };
	// "Pending" = no broker assigned yet (the field is sparse: null until the
	// admin picks a broker, then progresses through the workflow statuses).
	if (filter.pending) query.brokerId = { $in: [null, undefined] };
	const n = await BrokerRequest.countDocuments(query).exec();
	stop({ success: "true" });
	return n;
}

export async function updateBrokerRequestDB(
	id: string,
	patch: Partial<IBrokerRequest>,
): Promise<IBrokerRequest | null> {
	const stop = timer("updateBrokerRequestDB", IOperationType.Update);
	const b = await BrokerRequest.findOneAndUpdate(
		{ _id: id, deleted: false },
		{ $set: patch },
		{ new: true },
	).exec();
	stop({ success: "true" });
	return b;
}

export async function listBrokerRequestsForBuyerDB(
	buyerId: string,
): Promise<IBrokerRequest[]> {
	const stop = timer("listBrokerRequestsForBuyerDB");
	const items = await BrokerRequest.find({ buyerId, deleted: false })
		.sort({ createdAt: -1 })
		.exec();
	stop({ success: "true" });
	return items;
}
