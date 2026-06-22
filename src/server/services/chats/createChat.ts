import "server-only";
import type { Types } from "mongoose";
import { createChatDB, type IChat } from "@/server/models/chats";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export default async function createChat({
	payload,
}: {
	payload: Partial<IChat>;
}): Promise<IChat> {
	const chat = await createChatDB(payload);
	const buyerId = (chat.buyerId as Types.ObjectId).toString();
	const counterpartyId = chat.counterpartyId
		? (chat.counterpartyId as Types.ObjectId).toString()
		: undefined;
	await invalidateCacheKeys({
		id: chat._id.toString(),
		buyerId,
		counterpartyId,
	});
	return chat;
}
