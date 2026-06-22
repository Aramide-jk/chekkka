import "server-only";
import mongoose, { type Document, Schema } from "mongoose";
import {
	databaseResponseTimeHistogram,
	IOperationType,
} from "@/server/metrics";

export type PayoutStatus =
	| "pending"
	| "held"
	| "held_dispute"
	| "released"
	| "refunded";

export interface ITransaction extends Document {
	_id: mongoose.Types.ObjectId;
	buyerId: mongoose.Types.ObjectId;
	inspectorId?: mongoose.Types.ObjectId | null;
	inspectionId: mongoose.Types.ObjectId;
	amount: number;
	platformFee: number;
	currency: string;
	paystackRef: string;
	status: "pending" | "paid" | "failed";
	payoutStatus: PayoutStatus;
	payoutEligibleAt?: Date;
	paidAt?: Date;
	releasedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

const schema = new Schema<ITransaction>(
	{
		buyerId: {
			type: Schema.Types.ObjectId,
			ref: "users",
			required: true,
			index: true,
		},
		inspectorId: { type: Schema.Types.ObjectId, ref: "users", index: true },
		inspectionId: {
			type: Schema.Types.ObjectId,
			ref: "inspections",
			required: true,
			index: true,
		},
		amount: { type: Number, required: true },
		platformFee: { type: Number, default: 2500 },
		currency: { type: String, default: "NGN" },
		paystackRef: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		status: {
			type: String,
			enum: ["pending", "paid", "failed"],
			default: "pending",
		},
		payoutStatus: {
			type: String,
			enum: ["pending", "held", "held_dispute", "released", "refunded"],
			default: "pending",
		},
		payoutEligibleAt: Date,
		paidAt: Date,
		releasedAt: Date,
	},
	{ timestamps: true },
);

const COLLECTION = "transactions";
export const Transaction =
	(mongoose.models[COLLECTION] as mongoose.Model<ITransaction>) ||
	mongoose.model<ITransaction>(COLLECTION, schema);

function timer(method: string, op: IOperationType = IOperationType.Read) {
	return databaseResponseTimeHistogram.startTimer({
		operation: op,
		collection: COLLECTION,
		method,
	});
}

export async function createTransactionDB(
	payload: Partial<ITransaction>,
	session?: mongoose.ClientSession,
): Promise<ITransaction> {
	const stop = timer("createTransactionDB", IOperationType.Create);
	const arr = await Transaction.create([payload], { session });
	stop({ success: "true" });
	return arr[0];
}

export async function getTransactionByRefDB(
	ref: string,
): Promise<ITransaction | null> {
	const stop = timer("getTransactionByRefDB");
	const t = await Transaction.findOne({ paystackRef: ref }).exec();
	stop({ success: "true" });
	return t;
}

export async function listTransactionsForInspectorDB(
	inspectorId: string,
): Promise<ITransaction[]> {
	const stop = timer("listTransactionsForInspectorDB");
	const items = await Transaction.find({ inspectorId })
		.sort({ createdAt: -1 })
		.exec();
	stop({ success: "true" });
	return items;
}

export async function updateTransactionDB(
	id: string,
	patch: Partial<ITransaction>,
	session?: mongoose.ClientSession,
): Promise<ITransaction | null> {
	const stop = timer("updateTransactionDB", IOperationType.Update);
	const t = await Transaction.findOneAndUpdate(
		{ _id: id },
		{ $set: patch },
		{ new: true, session },
	).exec();
	stop({ success: "true" });
	return t;
}

export async function platformRevenueSumDB(since: Date): Promise<number> {
	const stop = timer("platformRevenueSumDB", IOperationType.Aggregate);
	const agg = await Transaction.aggregate([
		{ $match: { status: "paid", paidAt: { $gte: since } } },
		{ $group: { _id: null, total: { $sum: "$platformFee" } } },
	]).exec();
	stop({ success: "true" });
	return (agg[0]?.total as number | undefined) ?? 0;
}

export async function inspectorEarningsDB(inspectorId: string) {
	const stop = timer("inspectorEarningsDB", IOperationType.Aggregate);
	const objId = new mongoose.Types.ObjectId(inspectorId);
	const agg = await Transaction.aggregate([
		{ $match: { inspectorId: objId, status: "paid" } },
		{
			$group: {
				_id: "$payoutStatus",
				total: { $sum: { $subtract: ["$amount", "$platformFee"] } },
				count: { $sum: 1 },
			},
		},
	]).exec();
	stop({ success: "true" });

	let released = 0;
	let held = 0;
	let totalCount = 0;
	for (const row of agg) {
		totalCount += row.count;
		if (row._id === "released") released += row.total;
		if (row._id === "held" || row._id === "held_dispute") held += row.total;
	}
	return { released, held, totalCount };
}
