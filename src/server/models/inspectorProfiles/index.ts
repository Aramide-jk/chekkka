import "server-only";
import mongoose, { type Document, Schema } from "mongoose";
import {
	databaseResponseTimeHistogram,
	IOperationType,
} from "@/server/metrics";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const SLOT_TIMES = ["09:00", "11:00", "14:00", "16:00"] as const;

export interface ISlot {
	time: string;
	on: boolean;
}

export interface IDaySchedule {
	active: boolean;
	slots: ISlot[];
}

export interface IInspectorProfile extends Document {
	_id: mongoose.Types.ObjectId;
	userId: mongoose.Types.ObjectId;
	yearsExperience: number;
	specialisations: string[];
	bio: string;
	documents: {
		idDocument?: string;
		certificate?: string;
		extra?: string;
	};
	availability: {
		toggleOn: boolean;
	};
	schedule: {
		weekly: Record<string, IDaySchedule>;
		blockedDates: Date[];
	};
	rating: number;
	totalCompleted: number;
	deleted: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const slotSchema = new Schema<ISlot>(
	{
		time: { type: String, required: true },
		on: { type: Boolean, default: true },
	},
	{ _id: false },
);

const _daySchema = new Schema<IDaySchedule>(
	{
		active: { type: Boolean, default: true },
		slots: { type: [slotSchema], default: [] },
	},
	{ _id: false },
);

function defaultWeekly(): Record<string, IDaySchedule> {
	const out: Record<string, IDaySchedule> = {};
	for (const d of DAYS) {
		out[d] = {
			active: d !== "sun",
			slots: SLOT_TIMES.map((time) => ({ time, on: true })),
		};
	}
	return out;
}

const profileSchema = new Schema<IInspectorProfile>(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "users",
			required: true,
			unique: true,
			index: true,
		},
		yearsExperience: { type: Number, default: 0 },
		specialisations: { type: [String], default: [] },
		bio: { type: String, default: "" },
		documents: {
			idDocument: { type: String },
			certificate: { type: String },
			extra: { type: String },
		},
		availability: {
			toggleOn: { type: Boolean, default: true },
		},
		schedule: {
			weekly: { type: Schema.Types.Mixed, default: defaultWeekly },
			blockedDates: { type: [Date], default: [] },
		},
		rating: { type: Number, default: 0 },
		totalCompleted: { type: Number, default: 0 },
		deleted: { type: Boolean, default: false, select: false },
	},
	{ timestamps: true },
);

const COLLECTION = "inspectorprofiles";
export const InspectorProfile =
	(mongoose.models[COLLECTION] as mongoose.Model<IInspectorProfile>) ||
	mongoose.model<IInspectorProfile>(COLLECTION, profileSchema);

function timer(method: string, op: IOperationType = IOperationType.Read) {
	return databaseResponseTimeHistogram.startTimer({
		operation: op,
		collection: COLLECTION,
		method,
	});
}

export async function createInspectorProfileDB(
	payload: Partial<IInspectorProfile>,
): Promise<IInspectorProfile> {
	const stop = timer("createInspectorProfileDB", IOperationType.Create);
	const p = await InspectorProfile.create(payload);
	stop({ success: "true" });
	return p;
}

export async function getInspectorProfileByUserIdDB(
	userId: string,
): Promise<IInspectorProfile | null> {
	const stop = timer("getInspectorProfileByUserIdDB");
	const p = await InspectorProfile.findOne({
		userId,
		deleted: false,
	}).exec();
	stop({ success: "true" });
	return p;
}

export async function updateInspectorProfileDB(
	userId: string,
	patch: Partial<IInspectorProfile>,
): Promise<IInspectorProfile | null> {
	const stop = timer("updateInspectorProfileDB", IOperationType.Update);
	const p = await InspectorProfile.findOneAndUpdate(
		{ userId, deleted: false },
		{ $set: patch },
		{ new: true, upsert: false },
	).exec();
	stop({ success: "true" });
	return p;
}

export async function setAvailabilityDB(
	userId: string,
	toggleOn: boolean,
): Promise<boolean> {
	const stop = timer("setAvailabilityDB", IOperationType.Update);
	const res = await InspectorProfile.updateOne(
		{ userId, deleted: false },
		{ $set: { "availability.toggleOn": toggleOn } },
	).exec();
	stop({ success: "true" });
	return res.modifiedCount > 0;
}

export async function listInspectorsForBookingDB(
	city?: string,
	limit = 20,
	offset = 0,
): Promise<IInspectorProfile[]> {
	const stop = timer("listInspectorsForBookingDB", IOperationType.Aggregate);
	const matchStage: Record<string, unknown> = {
		deleted: false,
		"availability.toggleOn": true,
	};
	const pipeline: mongoose.PipelineStage[] = [
		{ $match: matchStage },
		{
			$lookup: {
				from: "users",
				localField: "userId",
				foreignField: "_id",
				as: "user",
			},
		},
		{ $unwind: "$user" },
		{ $match: { "user.status": "approved", "user.deleted": false } },
	];
	if (city) {
		pipeline.push({ $match: { "user.city": city } });
	}
	pipeline.push(
		{ $sort: { rating: -1, totalCompleted: -1 } },
		{ $skip: offset },
		{ $limit: limit },
	);
	const items = await InspectorProfile.aggregate(pipeline).exec();
	stop({ success: "true" });
	return items as IInspectorProfile[];
}

export async function listPendingApplicationsDB(): Promise<unknown[]> {
	const stop = timer("listPendingApplicationsDB", IOperationType.Aggregate);
	const items = await InspectorProfile.aggregate([
		{ $match: { deleted: false } },
		{
			$lookup: {
				from: "users",
				localField: "userId",
				foreignField: "_id",
				as: "user",
			},
		},
		{ $unwind: "$user" },
		{ $match: { "user.status": "pending", "user.role": "inspector" } },
		{ $sort: { createdAt: -1 } },
	]).exec();
	stop({ success: "true" });
	return items;
}

// Admin-side roster: every inspector profile joined with its user, optionally
// filtered by user.status. Distinct from `listInspectorsForBookingDB` (which
// only surfaces inspectors who are toggled-on AND approved) and
// `listPendingApplicationsDB` (pending only).
export async function listInspectorsByStatusDB(
	filter: { status?: "pending" | "approved" | "rejected" | "suspended" } = {},
	limit = 100,
	offset = 0,
): Promise<unknown[]> {
	const stop = timer("listInspectorsByStatusDB", IOperationType.Aggregate);
	const userMatch: Record<string, unknown> = {
		"user.role": "inspector",
		"user.deleted": false,
	};
	if (filter.status) userMatch["user.status"] = filter.status;

	const items = await InspectorProfile.aggregate([
		{ $match: { deleted: false } },
		{
			$lookup: {
				from: "users",
				localField: "userId",
				foreignField: "_id",
				as: "user",
			},
		},
		{ $unwind: "$user" },
		{ $match: userMatch },
		{ $sort: { createdAt: -1 } },
		{ $skip: offset },
		{ $limit: limit },
	]).exec();
	stop({ success: "true" });
	return items;
}

export const SLOT_TIMES_DEFAULT = SLOT_TIMES;
export const DAYS_DEFAULT = DAYS;
