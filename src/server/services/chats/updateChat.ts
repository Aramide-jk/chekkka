import "server-only";
import type { Types } from "mongoose";
import { type IChat, updateChatDB } from "@/server/models/chats";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export default async function updateChat({
	id,
	patch,
}: {
	id: string;
	patch: Partial<IChat>;
}): Promise<IChat | null> {
	const chat = await updateChatDB(id, patch);
	if (!chat) return null;

	const buyerId = (chat.buyerId as Types.ObjectId).toString();
	const counterpartyId = chat.counterpartyId
		? (chat.counterpartyId as Types.ObjectId).toString()
		: undefined;
	await invalidateCacheKeys({ id, buyerId, counterpartyId });
	return chat;
}
