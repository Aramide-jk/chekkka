import "server-only";
import mongoose, { type Document, Schema } from "mongoose";
import {
	databaseResponseTimeHistogram,
	IOperationType,
} from "@/server/metrics";

export type ChatType = "consultant" | "broker";
export type ChatStatus = "pending" | "active" | "closed";

export interface IChat extends Document {
	_id: mongoose.Types.ObjectId;
	buyerId: mongoose.Types.ObjectId;
	counterpartyId?: mongoose.Types.ObjectId | null;
	chatType: ChatType;
	status: ChatStatus;
	escalatedTo?: mongoose.Types.ObjectId | null;
	context?: string;
	lastMessageAt: Date;
	lastMessage?: string;
	unreadForBuyer: number;
	unreadForCounterparty: number;
	deleted: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const schema = new Schema<IChat>(
	{
		buyerId: {
			type: Schema.Types.ObjectId,
			ref: "users",
			required: true,
			index: true,
		},
		counterpartyId: {
			type: Schema.Types.ObjectId,
			ref: "users",
			index: true,
		},
		chatType: {
			type: String,
			enum: ["consultant", "broker"],
			required: true,
		},
		status: {
			type: String,
			enum: ["pending", "active", "closed"],
			default: "pending",
		},
		escalatedTo: { type: Schema.Types.ObjectId, ref: "users" },
		context: String,
		lastMessageAt: { type: Date, default: Date.now },
		lastMessage: String,
		unreadForBuyer: { type: Number, default: 0 },
		unreadForCounterparty: { type: Number, default: 0 },
		deleted: { type: Boolean, default: false, select: false },
	},
	{ timestamps: true },
);

const COLLECTION = "chats";
export const Chat =
	(mongoose.models[COLLECTION] as mongoose.Model<IChat>) ||
	mongoose.model<IChat>(COLLECTION, schema);

function timer(method: string, op: IOperationType = IOperationType.Read) {
	return databaseResponseTimeHistogram.startTimer({
		operation: op,
		collection: COLLECTION,
		method,
	});
}

export async function createChatDB(payload: Partial<IChat>): Promise<IChat> {
	const stop = timer("createChatDB", IOperationType.Create);
	const c = await Chat.create(payload);
	stop({ success: "true" });
	return c;
}

export async function getChatByIdDB(id: string): Promise<IChat | null> {
	const stop = timer("getChatByIdDB");
	if (!mongoose.isValidObjectId(id)) {
		stop({ success: "false" });
		return null;
	}
	const c = await Chat.findOne({ _id: id, deleted: false }).exec();
	stop({ success: "true" });
	return c;
}

export async function listChatsForUserDB(
	userId: string,
	role: "buyer" | "counterparty",
): Promise<IChat[]> {
	const stop = timer("listChatsForUserDB");
	const query: Record<string, unknown> = { deleted: false };
	if (role === "buyer") query.buyerId = userId;
	else
		query.$or = [
			{ counterpartyId: userId },
			{ escalatedTo: userId },
			{ status: "pending", counterpartyId: null },
		];
	const items = await Chat.find(query).sort({ lastMessageAt: -1 }).exec();
	stop({ success: "true" });
	return items;
}

export async function updateChatDB(
	id: string,
	patch: Partial<IChat>,
): Promise<IChat | null> {
	const stop = timer("updateChatDB", IOperationType.Update);
	const c = await Chat.findOneAndUpdate(
		{ _id: id, deleted: false },
		{ $set: patch },
		{ new: true },
	).exec();
	stop({ success: "true" });
	return c;
}

export async function findActiveChatForBuyerDB(
	buyerId: string,
	chatType: "consultant" | "broker",
): Promise<IChat | null> {
	const stop = timer("findActiveChatForBuyerDB");
	const c = await Chat.findOne({
		buyerId,
		chatType,
		status: { $ne: "closed" },
		deleted: false,
	})
		.sort({ lastMessageAt: -1 })
		.exec();
	stop({ success: "true" });
	return c;
}
