"use client";

import type { CSSProperties, ReactElement } from "react";

export type IconName =
	| "chevron-right"
	| "chevron-left"
	| "chevron-down"
	| "chevron-up"
	| "check"
	| "x"
	| "plus"
	| "minus"
	| "search"
	| "filter"
	| "bell"
	| "user"
	| "menu"
	| "home"
	| "car"
	| "camera"
	| "calendar"
	| "clock"
	| "map-pin"
	| "phone"
	| "mail"
	| "shield"
	| "shield-check"
	| "star"
	| "star-outline"
	| "settings"
	| "log-out"
	| "edit"
	| "trash"
	| "download"
	| "share"
	| "video"
	| "play"
	| "pause"
	| "send"
	| "paperclip"
	| "circle"
	| "circle-dot"
	| "warning"
	| "info"
	| "naira"
	| "chat"
	| "users"
	| "briefcase"
	| "tool"
	| "trending"
	| "eye"
	| "eye-off"
	| "sun"
	| "moon"
	| "sparkles"
	| "logo";

interface IProps {
	name: IconName;
	size?: number;
	stroke?: number;
	style?: CSSProperties;
	className?: string;
}

export default function Icon({
	name,
	size = 16,
	stroke = 1.6,
	style,
	className,
}: IProps): ReactElement | null {
	const props = {
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: stroke,
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
		style,
		className,
		"aria-hidden": true,
	};

	switch (name) {
		case "chevron-right":
			return (
				<svg {...props}>
					<path d="M9 6l6 6-6 6" />
				</svg>
			);
		case "chevron-left":
			return (
				<svg {...props}>
					<path d="M15 6l-6 6 6 6" />
				</svg>
			);
		case "chevron-down":
			return (
				<svg {...props}>
					<path d="M6 9l6 6 6-6" />
				</svg>
			);
		case "chevron-up":
			return (
				<svg {...props}>
					<path d="M6 15l6-6 6 6" />
				</svg>
			);
		case "check":
			return (
				<svg {...props}>
					<path d="M5 12l5 5L20 7" />
				</svg>
			);
		case "x":
			return (
				<svg {...props}>
					<path d="M6 6l12 12M18 6L6 18" />
				</svg>
			);
		case "plus":
			return (
				<svg {...props}>
					<path d="M12 5v14M5 12h14" />
				</svg>
			);
		case "minus":
			return (
				<svg {...props}>
					<path d="M5 12h14" />
				</svg>
			);
		case "search":
			return (
				<svg {...props}>
					<circle cx="11" cy="11" r="7" />
					<path d="M21 21l-4.3-4.3" />
				</svg>
			);
		case "filter":
			return (
				<svg {...props}>
					<path d="M3 5h18M6 12h12M10 19h4" />
				</svg>
			);
		case "bell":
			return (
				<svg {...props}>
					<path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9" />
					<path d="M10 21a2 2 0 004 0" />
				</svg>
			);
		case "user":
			return (
				<svg {...props}>
					<circle cx="12" cy="8" r="4" />
					<path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" />
				</svg>
			);
		case "menu":
			return (
				<svg {...props}>
					<path d="M3 6h18M3 12h18M3 18h18" />
				</svg>
			);
		case "home":
			return (
				<svg {...props}>
					<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z" />
				</svg>
			);
		case "car":
			return (
				<svg {...props}>
					<path d="M3 17h18M5 17V13l2-5h10l2 5v4M7 21v-4M17 21v-4" />
					<circle cx="8" cy="14" r="1" />
					<circle cx="16" cy="14" r="1" />
				</svg>
			);
		case "camera":
			return (
				<svg {...props}>
					<path d="M3 8a2 2 0 012-2h2l2-2h6l2 2h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
					<circle cx="12" cy="13" r="4" />
				</svg>
			);
		case "calendar":
			return (
				<svg {...props}>
					<rect x="3" y="5" width="18" height="16" rx="2" />
					<path d="M3 10h18M8 3v4M16 3v4" />
				</svg>
			);
		case "clock":
			return (
				<svg {...props}>
					<circle cx="12" cy="12" r="9" />
					<path d="M12 7v5l3 2" />
				</svg>
			);
		case "map-pin":
			return (
				<svg {...props}>
					<path d="M12 22s8-7 8-13a8 8 0 10-16 0c0 6 8 13 8 13z" />
					<circle cx="12" cy="9" r="3" />
				</svg>
			);
		case "phone":
			return (
				<svg {...props}>
					<path d="M5 4h4l2 5-3 2a11 11 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
				</svg>
			);
		case "mail":
			return (
				<svg {...props}>
					<rect x="3" y="5" width="18" height="14" rx="2" />
					<path d="M3 7l9 7 9-7" />
				</svg>
			);
		case "shield":
			return (
				<svg {...props}>
					<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" />
				</svg>
			);
		case "shield-check":
			return (
				<svg {...props}>
					<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" />
					<path d="M8 12l3 3 5-5" />
				</svg>
			);
		case "star":
			return (
				<svg {...props}>
					<path
						d="M12 3l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L3 10l6-1z"
						fill="currentColor"
					/>
				</svg>
			);
		case "star-outline":
			return (
				<svg {...props}>
					<path d="M12 3l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L3 10l6-1z" />
				</svg>
			);
		case "settings":
			return (
				<svg {...props}>
					<circle cx="12" cy="12" r="3" />
					<path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
				</svg>
			);
		case "log-out":
			return (
				<svg {...props}>
					<path d="M15 3h5a1 1 0 011 1v16a1 1 0 01-1 1h-5M10 17l5-5-5-5M15 12H3" />
				</svg>
			);
		case "edit":
			return (
				<svg {...props}>
					<path d="M12 20h9M16.5 3.5a2 2 0 012.8 2.8L7 19l-4 1 1-4z" />
				</svg>
			);
		case "trash":
			return (
				<svg {...props}>
					<path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" />
				</svg>
			);
		case "download":
			return (
				<svg {...props}>
					<path d="M12 3v12m-5-5l5 5 5-5M5 21h14" />
				</svg>
			);
		case "share":
			return (
				<svg {...props}>
					<circle cx="6" cy="12" r="3" />
					<circle cx="18" cy="6" r="3" />
					<circle cx="18" cy="18" r="3" />
					<path d="M9 11l6-4M9 13l6 4" />
				</svg>
			);
		case "video":
			return (
				<svg {...props}>
					<rect x="3" y="6" width="13" height="12" rx="2" />
					<path d="M16 10l5-3v10l-5-3z" />
				</svg>
			);
		case "play":
			return (
				<svg {...props}>
					<path d="M6 4l14 8-14 8z" fill="currentColor" />
				</svg>
			);
		case "pause":
			return (
				<svg {...props}>
					<rect x="6" y="4" width="4" height="16" />
					<rect x="14" y="4" width="4" height="16" />
				</svg>
			);
		case "send":
			return (
				<svg {...props}>
					<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
				</svg>
			);
		case "paperclip":
			return (
				<svg {...props}>
					<path d="M21 12l-8 8a5 5 0 01-7-7l9-9a3.5 3.5 0 015 5l-9 9a2 2 0 01-3-3l8-8" />
				</svg>
			);
		case "circle":
			return (
				<svg {...props}>
					<circle cx="12" cy="12" r="9" />
				</svg>
			);
		case "circle-dot":
			return (
				<svg {...props}>
					<circle cx="12" cy="12" r="9" />
					<circle cx="12" cy="12" r="3" fill="currentColor" />
				</svg>
			);
		case "warning":
			return (
				<svg {...props}>
					<path d="M12 2L2 21h20zM12 9v6M12 18v.5" />
				</svg>
			);
		case "info":
			return (
				<svg {...props}>
					<circle cx="12" cy="12" r="9" />
					<path d="M12 8v.1M12 11v5" />
				</svg>
			);
		case "naira":
			return (
				<svg {...props}>
					<path d="M6 4v16M18 4v16M6 4l12 16M3 9h18M3 15h18" />
				</svg>
			);
		case "chat":
			return (
				<svg {...props}>
					<path d="M21 12a8 8 0 01-12 7l-5 1 1-5a8 8 0 1116-3z" />
				</svg>
			);
		case "users":
			return (
				<svg {...props}>
					<circle cx="9" cy="8" r="3.5" />
					<path d="M2 21c.8-3.5 3.7-5.5 7-5.5s6.2 2 7 5.5" />
					<circle cx="17" cy="6" r="2.5" />
					<path d="M16 14c2.7 0 5 1.5 6 4" />
				</svg>
			);
		case "briefcase":
			return (
				<svg {...props}>
					<rect x="3" y="7" width="18" height="13" rx="2" />
					<path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18" />
				</svg>
			);
		case "tool":
			return (
				<svg {...props}>
					<path d="M14.7 6.3a4 4 0 015.4 5.4L8 24l-4-4L16.3 7.7a4 4 0 01-1.6-1.4z" />
				</svg>
			);
		case "trending":
			return (
				<svg {...props}>
					<path d="M3 17l6-6 4 4 8-8M14 7h7v7" />
				</svg>
			);
		case "eye":
			return (
				<svg {...props}>
					<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
					<circle cx="12" cy="12" r="3" />
				</svg>
			);
		case "eye-off":
			return (
				<svg {...props}>
					<path d="M3 3l18 18M10 5a10 10 0 0112 7c-1 2-2 3-4 4M14 14a3 3 0 01-4-4M8 8C5 9 3 12 3 12s4 7 10 7c2 0 3-.4 4-1" />
				</svg>
			);
		case "sun":
			return (
				<svg {...props}>
					<circle cx="12" cy="12" r="4" />
					<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
				</svg>
			);
		case "moon":
			return (
				<svg {...props}>
					<path d="M21 14a9 9 0 11-11-11 7 7 0 0011 11z" />
				</svg>
			);
		case "sparkles":
			return (
				<svg {...props}>
					<path
						d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM19 14l.7 2 2 .7-2 .7L19 19l-.7-1.6-2-.7 2-.7zM5 16l.5 1.5 1.5.5-1.5.5L5 20l-.5-1.5L3 18l1.5-.5z"
						fill="currentColor"
					/>
				</svg>
			);
		case "logo":
			return (
				<svg {...props}>
					<path
						d="M12 2L3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6z"
						fill="currentColor"
						opacity="0.18"
					/>
					<path d="M12 2L3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6z" />
					<path d="M8 12l3 3 5-5" />
				</svg>
			);
		default:
			return null;
	}
}
