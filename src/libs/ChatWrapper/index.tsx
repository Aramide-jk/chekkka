"use client";

import Link from "next/link";
import {
	type FormEvent,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import styled from "styled-components";
import useSWR from "swr";
import { Avatar, Button, Card, Eyebrow, Pill } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { AppContextProvider } from "@/hooks";
import { PageShell } from "@/layouts";
import type { IResponseEnvelope } from "@/types";

interface IProps {
	context?: string;
}

interface IChat {
	_id: string;
	chatType: "consultant" | "broker";
	status: string;
	lastMessage?: string;
	lastMessageAt: string;
	buyerId: string;
	counterpartyId?: string | null;
}

interface IRecommendation {
	inspectionType: string;
	price: number;
	description: string;
	ctaLink?: string;
}

interface IMessage {
	_id: string;
	chatId: string;
	senderId: string;
	kind: string;
	body: string;
	recommendation?: IRecommendation;
	createdAt: string;
}

const Grid = styled.div`
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 16px;
    height: 70vh;
    min-height: 540px;
    @media (max-width: 720px) { grid-template-columns: 1fr; height: auto; }
`;
const Sidebar = styled(Card)`padding: 14px; overflow-y: auto;`;
const ContactRow = styled.button<{ $on: boolean }>`
    width: 100%;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: var(--r-sm);
    background: ${(p) => (p.$on ? "var(--surface-2)" : "transparent")};
    border: 1px solid ${(p) => (p.$on ? "var(--hairline-strong)" : "transparent")};
    color: var(--ink);
    cursor: pointer;
    &:hover { background: var(--surface-2); }
`;
const ContactInfo = styled.div`min-width: 0; flex: 1;`;
const ContactName = styled.div`
    font-size: 14px;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
`;
const ContactMeta = styled.div`
    color: var(--ink-muted);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;
const ChatPane = styled(Card)`
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;
const ChatHead = styled.div`
    padding: 16px 22px;
    border-bottom: 1px solid var(--hairline);
    display: flex;
    align-items: center;
    justify-content: space-between;
`;
const Messages = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;
const Bubble = styled.div<{ $mine: boolean }>`
    align-self: ${(p) => (p.$mine ? "flex-end" : "flex-start")};
    max-width: 70%;
    padding: 12px 16px;
    border-radius: var(--r-md);
    background: ${(p) => (p.$mine ? "var(--gold-wash)" : "var(--surface-2)")};
    border: 1px solid ${(p) => (p.$mine ? "var(--gold-wash-2)" : "var(--hairline)")};
    color: var(--ink);
    font-size: 14px;
    line-height: 1.55;
`;
const RecoCard = styled.div<{ $mine: boolean }>`
    align-self: ${(p) => (p.$mine ? "flex-end" : "flex-start")};
    max-width: 74%;
    padding: 14px 16px;
    border-radius: var(--r-md);
    background: var(--gold-wash);
    border: 1px solid var(--gold);
    display: flex;
    flex-direction: column;
    gap: 8px;
`;
const SystemLine = styled.div`
    align-self: center;
    color: var(--caution);
    font-size: 12px;
    background: var(--caution-wash);
    border: 1px solid var(--caution-deep);
    padding: 6px 12px;
    border-radius: var(--r-pill);
`;
const Composer = styled.form`
    padding: 14px 18px;
    border-top: 1px solid var(--hairline);
    display: flex;
    align-items: center;
    gap: 10px;
`;
const Input = styled.input`
    flex: 1;
    padding: 12px 16px;
    background: var(--surface-2);
    border: 1px solid var(--hairline);
    border-radius: var(--r-pill);
    color: var(--ink);
    font-size: 14px;
`;
const Empty = styled.div`
    color: var(--ink-muted);
    font-size: 13px;
    padding: 24px 0;
    text-align: center;
`;

export default function ChatWrapper({ context }: IProps) {
	const { isUserLoggedIn } = useContext(AppContextProvider);
	const [selected, setSelected] = useState<string | null>(null);
	const [text, setText] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const { data: chatsData, mutate: refreshChats } = useSWR<
		IResponseEnvelope<{ chats: IChat[] }>
	>(isUserLoggedIn ? "/api/chats" : null, fetcher, {
		revalidateOnMount: true,
		refreshInterval: 10_000,
	});
	const chats = chatsData?.data?.chats ?? [];

	useEffect(() => {
		if (!selected && chats.length > 0) {
			setSelected(chats[0]._id);
		}
	}, [chats, selected]);

	useEffect(() => {
		if (!isUserLoggedIn) return;
		if (chats.length === 0 && chatsData) {
			api()
				.post("/api/chats", {
					chatType: context === "broker" ? "broker" : "consultant",
					context: context ?? undefined,
				})
				.then(() => refreshChats())
				.catch(() => undefined);
		}
	}, [isUserLoggedIn, chats.length, chatsData, context, refreshChats]);

	const { data: messageData, mutate: refreshMessages } = useSWR<
		IResponseEnvelope<{ messages: IMessage[]; chat: IChat }>
	>(selected ? `/api/chats/${selected}/messages` : null, fetcher, {
		revalidateOnMount: true,
		refreshInterval: 5_000,
	});
	const messages = messageData?.data?.messages ?? [];
	const myId = useMemo(() => {
		const meChat = messageData?.data?.chat;
		if (!meChat) return undefined;
		return meChat.buyerId;
	}, [messageData?.data?.chat]);

	const subtitle =
		context === "broker"
			? "A Chekka broker can negotiate, pay, and arrange delivery — chat below."
			: context === "special-request"
				? "Tell us about your special inspection request — we'll route it."
				: "Need help before booking? Chat with a Chekka consultant.";

	async function send(e: FormEvent) {
		e.preventDefault();
		if (!selected || !text.trim() || busy) return;
		setBusy(true);
		setError(null);
		try {
			await api().post(`/api/chats/${selected}/messages`, { body: text });
			setText("");
			await refreshMessages();
		} catch (err) {
			setError(getErrorMessage(err, "Could not send"));
		} finally {
			setBusy(false);
		}
	}

	return (
		<PageShell
			eyebrow="Chat"
			title="Talk to"
			titleEm="Chekka"
			navTitle="Chat"
			subtitle={subtitle}
		>
			<Grid>
				<Sidebar>
					<Eyebrow style={{ padding: "6px 12px 14px" }}>
						Conversations
					</Eyebrow>
					{chats.length === 0 && (
						<Empty>
							{isUserLoggedIn
								? "Starting a conversation…"
								: "Sign in to chat with a consultant."}
						</Empty>
					)}
					{chats.map((c) => (
						<ContactRow
							key={c._id}
							$on={selected === c._id}
							onClick={() => setSelected(c._id)}
						>
							<Avatar name={c.chatType} size={40} />
							<ContactInfo>
								<ContactName>
									{c.chatType === "broker"
										? "Broker"
										: "Consultant"}
								</ContactName>
								<ContactMeta>
									{c.lastMessage ?? "No messages yet"}
								</ContactMeta>
							</ContactInfo>
						</ContactRow>
					))}
				</Sidebar>

				<ChatPane>
					<ChatHead>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 12,
							}}
						>
							<Avatar name={context ?? "Chekka"} size={36} />
							<div>
								<div style={{ fontSize: 14 }}>
									{context === "broker"
										? "Broker"
										: "Consultant"}
								</div>
								<div
									style={{
										color: "var(--ink-muted)",
										fontSize: 12,
									}}
								>
									{messageData?.data?.chat?.status ?? "—"}
								</div>
							</div>
						</div>
						<Pill tone="gold" dot>
							Connected
						</Pill>
					</ChatHead>
					<Messages data-testid="chat-messages">
						{messages.length === 0 && (
							<Empty>
								Send the first message to get started.
							</Empty>
						)}
						{messages.map((m) => {
							const mine = m.senderId === myId;
							if (
								m.kind === "recommendation" &&
								m.recommendation
							) {
								return (
									<RecoCard key={m._id} $mine={mine}>
										<Eyebrow $gold>
											Recommended:{" "}
											{m.recommendation.inspectionType}
										</Eyebrow>
										<div style={{ fontSize: 14 }}>
											{m.recommendation.description ||
												m.body}
										</div>
										<div
											style={{
												color: "var(--gold-bright)",
												fontSize: 13,
											}}
										>
											₦
											{Number(
												m.recommendation.price || 0,
											).toLocaleString("en-NG")}
										</div>
										<Link
											href={
												m.recommendation.ctaLink ??
												"/book"
											}
										>
											<Button
												variant="primary"
												size="sm"
												fullWidth
											>
												Book now
											</Button>
										</Link>
									</RecoCard>
								);
							}
							if (m.kind === "escalation") {
								return (
									<SystemLine key={m._id}>
										Escalated to admin
									</SystemLine>
								);
							}
							return (
								<Bubble key={m._id} $mine={mine}>
									{m.body}
								</Bubble>
							);
						})}
					</Messages>
					{error && (
						<div
							role="alert"
							style={{
								padding: "8px 18px",
								color: "var(--danger)",
								fontSize: 12,
							}}
						>
							{error}
						</div>
					)}
					<Composer onSubmit={send}>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							icon="paperclip"
						/>
						<Input
							placeholder="Type your message…"
							value={text}
							onChange={(e) => setText(e.target.value)}
							disabled={!selected || busy}
						/>
						<Button
							type="submit"
							variant="primary"
							size="sm"
							iconRight="send"
							disabled={!text.trim() || !selected || busy}
						>
							Send
						</Button>
					</Composer>
				</ChatPane>
			</Grid>
		</PageShell>
	);
}
