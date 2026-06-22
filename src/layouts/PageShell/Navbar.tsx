"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Avatar, Button, Icon, Logo, Pill } from "@/components";
import { AppContextProvider, useNotifications } from "@/hooks";
import type { UserRole } from "@/types";

interface IProps {
	title?: string;
	showAccount?: boolean;
	notifications?: number;
}

const Bar = styled.header`
    position: sticky;
    top: 0;
    z-index: 50;
    backdrop-filter: blur(20px);
    background: rgba(14, 13, 10, 0.72);
    border-bottom: 1px solid var(--hairline);
`;

const Inner = styled.div`
    max-width: 1280px;
    margin: 0 auto;
    padding: 16px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
`;

const Left = styled.div`
    display: flex;
    align-items: center;
    gap: 24px;
`;

const Crumbs = styled.div`
    color: var(--ink-muted);
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;

    @media (max-width: 640px) {
        display: none;
    }
`;

const Right = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
`;

const BellAnchor = styled.div`
    position: relative;
`;

const BellWrap = styled.button`
    position: relative;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--surface);
    border: 1px solid var(--hairline);
    color: var(--ink-soft);
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover { color: var(--gold-bright); }
`;

const BellBadge = styled.span`
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    background: var(--danger);
    color: var(--ink);
    font-size: 10px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
    border: 2px solid var(--bg);
`;

const Panel = styled.div`
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 340px;
    max-height: 460px;
    overflow-y: auto;
    background: var(--surface);
    border: 1px solid var(--hairline);
    border-radius: var(--r-md);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.32);
    z-index: 60;
`;

const PanelHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--hairline);
`;

const PanelTitle = styled.div`
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-muted);
`;

const ReadAll = styled.button`
    color: var(--gold-bright);
    background: none;
    border: none;
    font-size: 12px;
    cursor: pointer;
    &:disabled { color: var(--ink-muted); cursor: default; }
`;

const Item = styled.button<{ $unread: boolean }>`
    display: block;
    width: 100%;
    text-align: left;
    padding: 12px 16px;
    background: ${(p) => (p.$unread ? "rgba(212, 175, 55, 0.06)" : "transparent")};
    border: none;
    border-bottom: 1px solid var(--hairline);
    color: var(--ink);
    cursor: pointer;
    &:hover { background: var(--surface-2); }
    &:last-child { border-bottom: none; }
`;

const ItemTitle = styled.div`
    font-size: 14px;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Dot = styled.span`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--gold-bright);
    flex-shrink: 0;
`;

const ItemBody = styled.div`
    font-size: 12px;
    color: var(--ink-soft);
    line-height: 1.45;
`;

const ItemTime = styled.div`
    font-size: 11px;
    color: var(--ink-muted);
    margin-top: 4px;
`;

const Empty = styled.div`
    padding: 24px 16px;
    color: var(--ink-muted);
    font-size: 13px;
    text-align: center;
`;

const AvatarAnchor = styled.div`
    position: relative;
`;

const AvatarButton = styled.button`
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    border-radius: 50%;
    display: inline-flex;
`;

const AccountPanel = styled.div`
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 240px;
    background: var(--surface);
    border: 1px solid var(--hairline);
    border-radius: var(--r-md);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.32);
    z-index: 60;
    overflow: hidden;
`;

const AccountHead = styled.div`
    padding: 14px 16px;
    border-bottom: 1px solid var(--hairline);
`;

const AccountName = styled.div`
    font-size: 14px;
    color: var(--ink);
    margin-bottom: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const AccountEmail = styled.div`
    font-size: 12px;
    color: var(--ink-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const AccountItem = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 16px;
    text-align: left;
    background: none;
    border: none;
    color: var(--ink);
    font-size: 14px;
    cursor: pointer;

    &:hover { background: var(--surface-2); }
`;

const AccountLink = styled(Link)`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 16px;
    color: var(--ink);
    font-size: 14px;

    &:hover { background: var(--surface-2); }
`;

const ROLE_HOME: Record<UserRole, string> = {
	buyer: "/dashboard",
	inspector: "/inspector/dashboard",
	consultant: "/consultant/chats",
	admin: "/admin",
	manager: "/admin",
};

const ROLE_LABEL: Record<UserRole, string> = {
	buyer: "Buyer",
	inspector: "Inspector",
	consultant: "Consultant",
	admin: "Admin",
	manager: "Manager",
};

function getInitials(fullName: string): string {
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRelative(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const m = Math.floor(diff / 60_000);
	if (m < 1) return "Just now";
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	const d = Math.floor(h / 24);
	if (d < 7) return `${d}d ago`;
	return new Date(iso).toLocaleDateString();
}

export default function Navbar({
	title,
	showAccount = true,
	notifications: notificationsOverride,
}: IProps) {
	const {
		notifications: items,
		unreadCount,
		markRead,
		markAllRead,
	} = useNotifications();
	const { user, isUserLoggedIn, logout } = useContext(AppContextProvider);
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [accountOpen, setAccountOpen] = useState(false);
	const anchorRef = useRef<HTMLDivElement | null>(null);
	const accountRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!open) return;
		const onClick = (e: MouseEvent) => {
			if (
				anchorRef.current &&
				!anchorRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", onClick);
		return () => document.removeEventListener("mousedown", onClick);
	}, [open]);

	useEffect(() => {
		if (!accountOpen) return;
		const onClick = (e: MouseEvent) => {
			if (
				accountRef.current &&
				!accountRef.current.contains(e.target as Node)
			) {
				setAccountOpen(false);
			}
		};
		document.addEventListener("mousedown", onClick);
		return () => document.removeEventListener("mousedown", onClick);
	}, [accountOpen]);

	const badge = notificationsOverride ?? unreadCount;
	const accountVisible = showAccount && isUserLoggedIn && !!user;
	const dashboardHref = user ? ROLE_HOME[user.role] : "/dashboard";

	async function handleLogout() {
		setAccountOpen(false);
		const ok = await logout();
		if (ok) {
			router.push("/");
			router.refresh();
		}
	}

	return (
		<Bar>
			<Inner>
				<Left>
					<Link href="/">
						<Logo />
					</Link>
					{title && <Crumbs>{title}</Crumbs>}
				</Left>
				<Right>
					{accountVisible && user ? (
						<>
							<Pill tone="ghost">
								<Icon name="circle-dot" size={10} />
								{ROLE_LABEL[user.role]}
							</Pill>
							<BellAnchor ref={anchorRef}>
								<BellWrap
									aria-label="Notifications"
									onClick={() => setOpen((o) => !o)}
								>
									<Icon name="bell" size={16} />
									{badge > 0 && (
										<BellBadge>{badge}</BellBadge>
									)}
								</BellWrap>
								{open && (
									<Panel role="menu">
										<PanelHead>
											<PanelTitle>
												Notifications
											</PanelTitle>
											<ReadAll
												type="button"
												onClick={() => markAllRead()}
												disabled={unreadCount === 0}
											>
												Mark all read
											</ReadAll>
										</PanelHead>
										{items.length === 0 ? (
											<Empty>You're all caught up.</Empty>
										) : (
											items.map((n) => (
												<Item
													key={n._id}
													$unread={!n.read}
													onClick={() => {
														if (!n.read)
															markRead(n._id);
														setOpen(false);
														if (n.link)
															router.push(n.link);
													}}
												>
													<ItemTitle>
														{!n.read && <Dot />}
														{n.title}
													</ItemTitle>
													{n.body && (
														<ItemBody>
															{n.body}
														</ItemBody>
													)}
													<ItemTime>
														{formatRelative(
															n.createdAt,
														)}
													</ItemTime>
												</Item>
											))
										)}
									</Panel>
								)}
							</BellAnchor>
							<AvatarAnchor ref={accountRef}>
								<AvatarButton
									type="button"
									aria-label={`Account menu for ${user.fullName}`}
									aria-expanded={accountOpen}
									onClick={() => setAccountOpen((o) => !o)}
								>
									<Avatar
										name={getInitials(user.fullName)}
										size={36}
									/>
								</AvatarButton>
								{accountOpen && (
									<AccountPanel role="menu">
										<AccountHead>
											<AccountName>
												{user.fullName}
											</AccountName>
											<AccountEmail>
												{user.email}
											</AccountEmail>
										</AccountHead>
										<AccountLink
											href={dashboardHref}
											onClick={() =>
												setAccountOpen(false)
											}
										>
											<Icon name="home" size={16} />
											Dashboard
										</AccountLink>
										<AccountItem
											type="button"
											onClick={handleLogout}
										>
											<Icon name="log-out" size={16} />
											Sign out
										</AccountItem>
									</AccountPanel>
								)}
							</AvatarAnchor>
						</>
					) : (
						<Link href="/login">
							<Button variant="ghost" size="sm">
								Sign in
							</Button>
						</Link>
					)}
				</Right>
			</Inner>
		</Bar>
	);
}
