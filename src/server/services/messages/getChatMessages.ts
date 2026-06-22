import "server-only";
import { ErrChatNotFound, ErrForbidden } from "@/server/constants/errors";
import type { IChat } from "@/server/models/chats";
import type { IMessage } from "@/server/models/messages";
import getChatById from "../chats/getChatById";
import listForChat from "./listForChat";

function canAccess(
	role: string,
	userId: string,
	chat: {
		buyerId: { toString(): string };
		counterpartyId?: unknown;
		escalatedTo?: unknown;
		status?: string;
		chatType?: string;
	},
) {
	if (role === "admin") return true;
	if (chat.buyerId.toString() === userId) return true;
	const cp = (
		chat.counterpartyId as { toString(): string } | undefined
	)?.toString();
	const esc = (
		chat.escalatedTo as { toString(): string } | undefined
	)?.toString();
	if (cp === userId || esc === userId) return true;
	// A consultant may pick up an as-yet-unclaimed pending consultant chat —
	// this is how assignment happens (their first reply claims it).
	if (
		role === "consultant" &&
		!cp &&
		chat.status === "pending" &&
		(chat.chatType ?? "consultant") === "consultant"
	) {
		return true;
	}
	return false;
}

/**
 * Load a chat with access checks plus the cached message list. Centralises
 * the auth+lookup pattern previously inlined in the route.
 */
export default async function getChatMessages({
	chatId,
	caller,
}: {
	chatId: string;
	caller: { id: string; role: string };
}): Promise<{ chat: IChat; messages: IMessage[] }> {
	const chat = await getChatById({ id: chatId });
	if (!chat) throw ErrChatNotFound;
	if (!canAccess(caller.role, caller.id, chat)) throw ErrForbidden;

	const messages = await listForChat({ chatId });
	return { chat, messages };
}
