import "server-only";
import type { Types } from "mongoose";
import { ErrChatNotFound, ErrForbidden } from "@/server/constants/errors";
import { chatChannel, publish } from "@/server/lib/pubsub";
import type { IChat } from "@/server/models/chats";
import {
	createMessageDB,
	type IMessage,
	type MessageKind,
} from "@/server/models/messages";
import getChatById from "../chats/getChatById";
import updateChat from "../chats/updateChat";
import emitNotification from "../notifications/emitNotification";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

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
	// posting the first reply is what claims it (see status/counterparty
	// transition below).
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

export interface IPostMessageInput {
	chatId: string;
	sender: { id: string; role: string };
	body: string;
	kind?: MessageKind;
	recommendation?: {
		inspectionType: string;
		price: number;
		description: string;
		ctaLink?: string;
	};
}

/**
 * Persist a chat message, update the parent chat's unread counters and last
 * message preview, publish over pub/sub, and emit an in-app notification to
 * the recipient if applicable. Throws ErrChatNotFound / ErrForbidden when
 * access checks fail.
 */
export default async function postMessage({
	chatId,
	sender,
	body,
	kind = "text",
	recommendation,
}: IPostMessageInput): Promise<{ message: IMessage; chat: IChat }> {
	const chat = await getChatById({ id: chatId });
	if (!chat) throw ErrChatNotFound;
	if (!canAccess(sender.role, sender.id, chat)) throw ErrForbidden;

	const message = await createMessageDB({
		chatId: chat._id,
		senderId: sender.id as unknown as Types.ObjectId,
		kind,
		body,
		...(kind === "recommendation" && recommendation
			? { recommendation }
			: {}),
	});
	await invalidateCacheKeys({ chatId });

	const isFromBuyer = chat.buyerId.toString() === sender.id;
	const updatedChat = await updateChat({
		id: chatId,
		patch: {
			lastMessageAt: new Date(),
			lastMessage: body.slice(0, 140),
			unreadForBuyer: isFromBuyer ? 0 : chat.unreadForBuyer + 1,
			unreadForCounterparty: isFromBuyer
				? chat.unreadForCounterparty + 1
				: 0,
			status:
				chat.status === "pending" && !isFromBuyer
					? "active"
					: chat.status,
			...(chat.status === "pending" && !isFromBuyer
				? { counterpartyId: sender.id as unknown as Types.ObjectId }
				: {}),
		},
	});

	await publish(chatChannel(chatId), { type: "message", message });

	const recipientId = isFromBuyer
		? (chat.counterpartyId?.toString() ?? null)
		: chat.buyerId.toString();
	if (recipientId && recipientId !== sender.id) {
		const preview = body.slice(0, 140);
		await emitNotification({
			userId: recipientId,
			kind:
				chat.chatType === "broker"
					? "chat.broker.message"
					: "chat.consultant.message",
			title:
				chat.chatType === "broker"
					? "New message from your broker"
					: "New message from your consultant",
			body: preview,
			link: `/chat/${chatId}`,
		}).catch(() => undefined);
	}

	return { message, chat: updatedChat ?? chat };
}
