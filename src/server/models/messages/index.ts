import "server-only";
import mongoose, { type Document, Schema } from "mongoose";
import {
	databaseResponseTimeHistogram,
	IOperationType,
} from "@/server/metrics";

export type MessageKind =
	| "text"
	| "attachment"
	| "recommendation"
	| "escalation";

export interface IMessage extends Document {
	_id: mongoose.Types.ObjectId;
	chatId: mongoose.Types.ObjectId;
	senderId: mongoose.Types.ObjectId;
	kind: MessageKind;
	body: string;
	attachments: string[];
	recommendation?: {
		inspectionType: string;
		price: number;
		description: string;
		ctaLink?: string;
	};
	createdAt: Date;
	updatedAt: Date;
}

const schema = new Schema<IMessage>(
	{
		chatId: {
			type: Schema.Types.ObjectId,
			ref: "chats",
			required: true,
			index: true,
		},
		senderId: {
			type: Schema.Types.ObjectId,
			ref: "users",
			required: true,
		},
		kind: {
			type: String,
			enum: ["text", "attachment", "recommendation", "escalation"],
			default: "text",
		},
		body: { type: String, default: "" },
		attachments: { type: [String], default: [] },
		recommendation: {
			inspectionType: String,
			price: Number,
			description: String,
			ctaLink: String,
		},
	},
	{ timestamps: true },
);

const COLLECTION = "messages";
export const Message =
	(mongoose.models[COLLECTION] as mongoose.Model<IMessage>) ||
	mongoose.model<IMessage>(COLLECTION, schema);

function timer(method: string, op: IOperationType = IOperationType.Read) {
	return databaseResponseTimeHistogram.startTimer({
		operation: op,
		collection: COLLECTION,
		method,
	});
}

export async function createMessageDB(
	payload: Partial<IMessage>,
): Promise<IMessage> {
	const stop = timer("createMessageDB", IOperationType.Create);
	const m = await Message.create(payload);
	stop({ success: "true" });
	return m;
}

export async function listMessagesForChatDB(
	chatId: string,
	limit = 200,
): Promise<IMessage[]> {
	const stop = timer("listMessagesForChatDB");
	const items = await Message.find({ chatId })
		.sort({ createdAt: 1 })
		.limit(limit)
		.exec();
	stop({ success: "true" });
	return items;
}
