import "server-only";
import type { Types } from "mongoose";
import { notificationChannel, publish } from "@/server/lib/pubsub";
import {
	createNotificationDB,
	type INotification,
} from "@/server/models/notifications";
import unreadCount from "./unreadCount";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export type NotificationChannel = "in_app" | "sms" | "email";

export interface IEmitNotificationInput {
	userId: string | Types.ObjectId;
	kind: string;
	title: string;
	body?: string;
	link?: string;
	channels?: NotificationChannel[];
}

export interface IEmitNotificationResult {
	notification: INotification;
	unreadCount: number;
}

/**
 * Persist an in-app notification and fan it out over Redis pub/sub so any
 * connected SSE listener for that user receives it in real time. SMS and
 * email channels are reserved for future providers — they no-op today but
 * the channel list is captured so callers can express intent now.
 */
export default async function emitNotification(
	input: IEmitNotificationInput,
): Promise<IEmitNotificationResult> {
	const channels: NotificationChannel[] = input.channels ?? ["in_app"];
	const userId = input.userId.toString();

	const notification = await createNotificationDB({
		userId: input.userId as Types.ObjectId,
		kind: input.kind,
		title: input.title,
		body: input.body ?? "",
		link: input.link,
		read: false,
	});

	await invalidateCacheKeys({ userId });
	const count = await unreadCount({ userId, refreshCache: true }).catch(
		() => 0,
	);

	if (channels.includes("in_app")) {
		await publish(notificationChannel(userId), {
			type: "notification",
			notification: {
				_id: notification._id.toString(),
				userId,
				kind: notification.kind,
				title: notification.title,
				body: notification.body,
				link: notification.link,
				read: notification.read,
				createdAt: notification.createdAt.toISOString(),
			},
			unreadCount: count,
		});
	}

	// SMS / email providers are not wired yet — see Chekka_Core_Features.md
	// Feature 11. Keep the channels list so callers express delivery intent.

	return { notification, unreadCount: count };
}
