import "server-only";
import { notificationChannel, publish } from "@/server/lib/pubsub";
import { markNotificationReadDB } from "@/server/models/notifications";
import unreadCount from "./unreadCount";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export default async function markRead({
	notificationId,
	userId,
}: {
	notificationId: string;
	userId: string;
}): Promise<{ updated: boolean; unreadCount: number }> {
	const updated = await markNotificationReadDB(notificationId, userId);
	if (!updated) return { updated: false, unreadCount: 0 };

	await invalidateCacheKeys({ userId });
	const count = await unreadCount({ userId, refreshCache: true }).catch(
		() => 0,
	);

	await publish(notificationChannel(userId), {
		type: "read",
		notificationId,
		unreadCount: count,
	});

	return { updated: true, unreadCount: count };
}
