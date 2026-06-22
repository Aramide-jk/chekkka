import "server-only";
import type { Types } from "mongoose";
import type { IChat } from "@/server/models/chats";
import createChat from "./createChat";
import findActiveForBuyer from "./findActiveForBuyer";

/**
 * Convenience composition: if the buyer has an open chat of the given type,
 * return it; otherwise spin up a new pending chat. Used by the POST /api/chats
 * route.
 */
export default async function getOrCreateForBuyer({
	buyerId,
	chatType,
	context,
}: {
	buyerId: string;
	chatType: "consultant" | "broker";
	context?: string;
}): Promise<{ chat: IChat; created: boolean }> {
	const existing = await findActiveForBuyer({ buyerId, chatType });
	if (existing) return { chat: existing, created: false };

	const chat = await createChat({
		payload: {
			buyerId: buyerId as unknown as Types.ObjectId,
			chatType,
			context,
			status: "pending",
			lastMessageAt: new Date(),
		},
	});
	return { chat, created: true };
}
