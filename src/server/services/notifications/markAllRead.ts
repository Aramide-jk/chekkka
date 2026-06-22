import "server-only";
import { notificationChannel, publish } from "@/server/lib/pubsub";
import { markAllReadDB } from "@/server/models/notifications";
import invalidateCacheKeys from "./utils/invalidateCacheKeys";

export default async function markAllRead({
	userId,
}: {
	userId: string;
}): Promise<{ modified: number; unreadCount: 0 }> {
	const modified = await markAllReadDB(userId);
	await invalidateCacheKeys({ userId });

	await publish(notificationChannel(userId), {
		type: "read_all",
		unreadCount: 0,
	});

	return { modified, unreadCount: 0 };
}
