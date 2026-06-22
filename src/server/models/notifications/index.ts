import "server-only";
import mongoose, { type Document, Schema } from "mongoose";
import {
	databaseResponseTimeHistogram,
	IOperationType,
} from "@/server/metrics";

export interface INotification extends Document {
	_id: mongoose.Types.ObjectId;
	userId: mongoose.Types.ObjectId;
	kind: string;
	title: string;
	body: string;
	link?: string;
	read: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const schema = new Schema<INotification>(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "users",
			required: true,
			index: true,
		},
		kind: { type: String, required: true },
		title: { type: String, required: true },
		body: { type: String, default: "" },
		link: String,
		read: { type: Boolean, default: false, index: true },
	},
	{ timestamps: true },
);

const COLLECTION = "notifications";
export const Notification =
	(mongoose.models[COLLECTION] as mongoose.Model<INotification>) ||
	mongoose.model<INotification>(COLLECTION, schema);

function timer(method: string, op: IOperationType = IOperationType.Read) {
	return databaseResponseTimeHistogram.startTimer({
		operation: op,
		collection: COLLECTION,
		method,
	});
}

export async function createNotificationDB(
	payload: Partial<INotification>,
): Promise<INotification> {
	const stop = timer("createNotificationDB", IOperationType.Create);
	const n = await Notification.create(payload);
	stop({ success: "true" });
	return n;
}

export async function listNotificationsForUserDB(
	userId: string,
	limit = 30,
): Promise<INotification[]> {
	const stop = timer("listNotificationsForUserDB");
	const items = await Notification.find({ userId })
		.sort({ createdAt: -1 })
		.limit(limit)
		.exec();
	stop({ success: "true" });
	return items;
}

export async function markNotificationReadDB(
	id: string,
	userId: string,
): Promise<boolean> {
	const stop = timer("markNotificationReadDB", IOperationType.Update);
	const res = await Notification.updateOne(
		{ _id: id, userId },
		{ $set: { read: true } },
	).exec();
	stop({ success: "true" });
	return res.modifiedCount > 0;
}

export async function markAllReadDB(userId: string): Promise<number> {
	const stop = timer("markAllReadDB", IOperationType.Update);
	const res = await Notification.updateMany(
		{ userId, read: false },
		{ $set: { read: true } },
	).exec();
	stop({ success: "true" });
	return res.modifiedCount;
}

export async function unreadCountDB(userId: string): Promise<number> {
	const stop = timer("unreadCountDB");
	const n = await Notification.countDocuments({ userId, read: false }).exec();
	stop({ success: "true" });
	return n;
}
