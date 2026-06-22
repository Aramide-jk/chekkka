"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { api, fetcher } from "@/constants";
import { AppContextProvider } from "@/hooks/Context/AppContext";
import type { IResponseEnvelope } from "@/types";

export interface INotificationItem {
	_id: string;
	kind: string;
	title: string;
	body?: string;
	link?: string;
	read: boolean;
	createdAt: string;
}

interface INotificationsResponse {
	notifications: INotificationItem[];
	unreadCount: number;
}

interface IStreamEvent {
	type: "notification" | "read" | "read_all";
	notification?: INotificationItem;
	notificationId?: string;
	unreadCount?: number;
}

interface IUseNotifications {
	notifications: INotificationItem[];
	unreadCount: number;
	isLoading: boolean;
	markRead: (id: string) => Promise<void>;
	markAllRead: () => Promise<void>;
}

export default function useNotifications(): IUseNotifications {
	const { isUserLoggedIn } = useContext(AppContextProvider);

	const { data, isLoading, mutate } = useSWR<
		IResponseEnvelope<INotificationsResponse>
	>(isUserLoggedIn ? "/api/notifications" : null, fetcher, {
		revalidateOnMount: true,
	});

	const [items, setItems] = useState<INotificationItem[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const sourceRef = useRef<EventSource | null>(null);

	useEffect(() => {
		if (data?.data) {
			setItems(data.data.notifications);
			setUnreadCount(data.data.unreadCount);
		}
	}, [data]);

	useEffect(() => {
		if (!isUserLoggedIn) {
			sourceRef.current?.close();
			sourceRef.current = null;
			setItems([]);
			setUnreadCount(0);
			return;
		}

		const source = new EventSource("/api/notifications/stream", {
			withCredentials: true,
		});
		sourceRef.current = source;

		const onSnapshot = (e: MessageEvent) => {
			try {
				const payload = JSON.parse(e.data) as INotificationsResponse;
				setItems(payload.notifications);
				setUnreadCount(payload.unreadCount);
			} catch {
				// ignore malformed
			}
		};

		const onEvent = (e: MessageEvent) => {
			try {
				const payload = JSON.parse(e.data) as IStreamEvent;
				if (payload.type === "notification" && payload.notification) {
					const incoming = payload.notification as INotificationItem;
					setItems((prev) => [
						incoming,
						...prev.filter((n) => n._id !== incoming._id),
					]);
					if (typeof payload.unreadCount === "number") {
						setUnreadCount(payload.unreadCount);
					} else {
						setUnreadCount((c) => c + 1);
					}
					// Inspection/inspector notifications imply server-side state
					// that the page-level SWR queries care about (dashboards,
					// job lists, inspection detail). Revalidate them so the
					// recipient sees the new job without a manual reload.
					if (
						incoming.kind.startsWith("inspector.") ||
						incoming.kind.startsWith("inspection.")
					) {
						globalMutate("/api/dashboard/inspector");
						globalMutate("/api/dashboard/buyer");
						globalMutate(
							(key) =>
								typeof key === "string" &&
								key.startsWith("/api/inspections"),
						);
					}
				} else if (payload.type === "read") {
					setItems((prev) =>
						prev.map((n) =>
							n._id === payload.notificationId
								? { ...n, read: true }
								: n,
						),
					);
					if (typeof payload.unreadCount === "number") {
						setUnreadCount(payload.unreadCount);
					}
				} else if (payload.type === "read_all") {
					setItems((prev) => prev.map((n) => ({ ...n, read: true })));
					setUnreadCount(0);
				}
			} catch {
				// ignore malformed
			}
		};

		source.addEventListener("snapshot", onSnapshot);
		source.addEventListener("notification", onEvent);

		source.onerror = () => {
			// Browser auto-reconnects EventSource on transient errors. Close
			// only on explicit unmount via the cleanup below.
		};

		return () => {
			source.removeEventListener("snapshot", onSnapshot);
			source.removeEventListener("notification", onEvent);
			source.close();
			sourceRef.current = null;
		};
	}, [isUserLoggedIn]);

	const markRead = useCallback(
		async (id: string) => {
			setItems((prev) =>
				prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
			);
			setUnreadCount((c) => Math.max(0, c - 1));
			try {
				await api().patch(`/api/notifications/${id}/read`);
				await mutate();
			} catch {
				// stream will eventually correct local state
			}
		},
		[mutate],
	);

	const markAllRead = useCallback(async () => {
		setItems((prev) => prev.map((n) => ({ ...n, read: true })));
		setUnreadCount(0);
		try {
			await api().post("/api/notifications/read-all");
			await mutate();
		} catch {
			// stream will eventually correct local state
		}
	}, [mutate]);

	return {
		notifications: items,
		unreadCount,
		isLoading,
		markRead,
		markAllRead,
	};
}
