import "server-only";
import mongoose, { type Document, Schema } from "mongoose";
import {
	databaseResponseTimeHistogram,
	IOperationType,
} from "@/server/metrics";

export type PhotoSection =
	| "exterior"
	| "interior"
	| "engine"
	| "test_drive"
	| "other";

export interface IInspectionPhoto extends Document {
	_id: mongoose.Types.ObjectId;
	inspectionId: mongoose.Types.ObjectId;
	section: PhotoSection;
	url: string;
	note?: string;
	takenAt: Date;
	sequence: number;
	contentHash?: string;
	deleted: boolean;
}

const schema = new Schema<IInspectionPhoto>(
	{
		inspectionId: {
			type: Schema.Types.ObjectId,
			ref: "inspections",
			required: true,
			index: true,
		},
		section: {
			type: String,
			enum: ["exterior", "interior", "engine", "test_drive", "other"],
			required: true,
		},
		url: { type: String, required: true },
		note: { type: String },
		takenAt: { type: Date, default: Date.now },
		sequence: { type: Number, default: 0 },
		contentHash: { type: String },
		deleted: { type: Boolean, default: false, select: false },
	},
	{ timestamps: true },
);

// One photo per (inspection, file-content) pair. Partial index so old records
// without a contentHash — and uploads that arrive without a file buffer (e.g.
// urlOverride only) — don't trip the constraint.
schema.index(
	{ inspectionId: 1, contentHash: 1 },
	{
		unique: true,
		partialFilterExpression: { contentHash: { $exists: true } },
	},
);

const COLLECTION = "inspectionphotos";
export const InspectionPhoto =
	(mongoose.models[COLLECTION] as mongoose.Model<IInspectionPhoto>) ||
	mongoose.model<IInspectionPhoto>(COLLECTION, schema);

function timer(method: string, op: IOperationType = IOperationType.Read) {
	return databaseResponseTimeHistogram.startTimer({
		operation: op,
		collection: COLLECTION,
		method,
	});
}

export async function createInspectionPhotoDB(
	payload: Partial<IInspectionPhoto>,
): Promise<IInspectionPhoto> {
	const stop = timer("createInspectionPhotoDB", IOperationType.Create);
	const p = await InspectionPhoto.create(payload);
	stop({ success: "true" });
	return p;
}

export async function listPhotosForInspectionDB(
	inspectionId: string,
): Promise<IInspectionPhoto[]> {
	const stop = timer("listPhotosForInspectionDB");
	const items = await InspectionPhoto.find({
		inspectionId,
		deleted: false,
	})
		.sort({ takenAt: 1 })
		.exec();
	stop({ success: "true" });
	return items;
}

export async function countPhotosForInspectionDB(
	inspectionId: string,
): Promise<number> {
	const stop = timer("countPhotosForInspectionDB");
	const n = await InspectionPhoto.countDocuments({
		inspectionId,
		deleted: false,
	}).exec();
	stop({ success: "true" });
	return n;
}

export async function nextPhotoSequenceDB(
	inspectionId: string,
): Promise<number> {
	const stop = timer("nextPhotoSequenceDB");
	const last = await InspectionPhoto.findOne({ inspectionId })
		.sort({ sequence: -1 })
		.exec();
	stop({ success: "true" });
	return last ? last.sequence + 1 : 1;
}

export async function findPhotoByHashDB(
	inspectionId: string,
	contentHash: string,
): Promise<IInspectionPhoto | null> {
	const stop = timer("findPhotoByHashDB");
	const p = await InspectionPhoto.findOne({
		inspectionId,
		contentHash,
		deleted: false,
	}).exec();
	stop({ success: "true" });
	return p;
}
