import "server-only";
import type { Types } from "mongoose";
import { ErrChatNotFound, ErrForbidden } from "@/server/constants/errors";
import { listUsersByRoleDB } from "@/server/models/users";
import postMessage from "../messages/postMessage";
import emitNotification from "../notifications/emitNotification";
import getChatById from "./getChatById";
import updateChat from "./updateChat";

function canEscalate(
	role: string,
	userId: string,
	chat: { counterpartyId?: unknown; escalatedTo?: unknown },
): boolean {
	if (role === "admin") return true;
	const cp = (
		chat.counterpartyId as { toString(): string } | undefined
	)?.toString();
	return cp === userId;
}

/**
 * A consultant escalates a chat to admin. Records an escalation message, flags
 * the chat with `escalatedTo` (the first admin), and notifies that admin so it
 * surfaces in their queue.
 */
export default async function escalateChat({
	chatId,
	caller,
	reason,
}: {
	chatId: string;
	caller: { id: string; role: string };
	reason: string;
}) {
	const chat = await getChatById({ id: chatId });
	if (!chat) throw ErrChatNotFound;
	if (!canEscalate(caller.role, caller.id, chat)) throw ErrForbidden;

	const [admin] = await listUsersByRoleDB("admin", {}, 1);
	const adminId = admin?._id?.toString();

	await updateChat({
		id: chatId,
		patch: adminId
			? { escalatedTo: adminId as unknown as Types.ObjectId }
			: {},
	});

	// Append the escalation as a message in the thread (visible to admin).
	await postMessage({
		chatId,
		sender: caller,
		body: reason,
		kind: "escalation",
	}).catch(() => undefined);

	if (adminId) {
		await emitNotification({
			userId: adminId,
			kind: "chat.escalated",
			title: "Chat escalated",
			body: reason.slice(0, 140),
			link: `/chat/${chatId}`,
		}).catch(() => undefined);
	}

	return { escalated: true };
}
