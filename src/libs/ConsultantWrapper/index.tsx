"use client";

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

const TABS = ["Pending", "Active", "Escalated"] as const;
type TabKey = (typeof TABS)[number];

interface IChat {
	_id: string;
	chatType: "consultant" | "broker";
	status: string;
	escalatedTo?: string | null;
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
const Tabs = styled.div`
    display: flex;
    gap: 4px;
    margin-bottom: 10px;
`;
const Tab = styled.button<{ $on: boolean }>`
    flex: 1;
    padding: 8px 6px;
    background: ${(p) => (p.$on ? "var(--surface-2)" : "transparent")};
    color: ${(p) => (p.$on ? "var(--gold-bright)" : "var(--ink-muted)")};
    border: 1px solid ${(p) => (p.$on ? "var(--hairline-strong)" : "transparent")};
    border-radius: var(--r-sm);
    font-size: 12px;
    cursor: pointer;
`;
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
const ContactName = styled.div`font-size: 14px; margin-bottom: 4px;`;
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
    gap: 12px;
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
    max-width: 72%;
    padding: 14px 16px;
    border-radius: var(--r-md);
    background: var(--gold-wash);
    border: 1px solid var(--gold);
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
const Panel = styled.div`
    padding: 14px 18px;
    border-top: 1px solid var(--hairline);
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--surface-2);
    label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--ink-soft); }
    input, select, textarea {
        padding: 9px 12px;
        background: var(--surface-1);
        border: 1px solid var(--hairline-strong);
        border-radius: var(--r-sm);
        color: var(--ink);
        font-family: var(--sans);
        font-size: 14px;
    }
`;
const Empty = styled.div`
    color: var(--ink-muted);
    font-size: 13px;
    padding: 24px 0;
    text-align: center;
`;

function naira(n: number) {
	return `₦${Number(n || 0).toLocaleString("en-NG")}`;
}

export default function ConsultantWrapper() {
	const { user } = useContext(AppContextProvider);
	const myId = user?.id;
	const [tab, setTab] = useState<TabKey>("Pending");
	const [selected, setSelected] = useState<string | null>(null);
	const [text, setText] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [showReco, setShowReco] = useState(false);
	const [reco, setReco] = useState({
		inspectionType: "standard",
		price: "",
		description: "",
	});

	const { data: chatsData, mutate: refreshChats } = useSWR<
		IResponseEnvelope<{ chats: IChat[] }>
	>("/api/chats", fetcher, {
		revalidateOnMount: true,
		refreshInterval: 10_000,
	});
	const chats = useMemo(() => chatsData?.data?.chats ?? [], [chatsData]);

	const byTab = useMemo(
		() => ({
			Pending: chats.filter((c) => c.status === "pending"),
			Active: chats.filter(
				(c) => c.status === "active" && !c.escalatedTo,
			),
			Escalated: chats.filter((c) => !!c.escalatedTo),
		}),
		[chats],
	);
	const rows = byTab[tab];

	useEffect(() => {
		if (selected && !chats.find((c) => c._id === selected)) {
			setSelected(null);
		}
	}, [chats, selected]);

	const { data: messageData, mutate: refreshMessages } = useSWR<
		IResponseEnvelope<{ messages: IMessage[]; chat: IChat }>
	>(selected ? `/api/chats/${selected}/messages` : null, fetcher, {
		revalidateOnMount: true,
		refreshInterval: 5_000,
	});
	const messages = messageData?.data?.messages ?? [];
	const activeChat = messageData?.data?.chat;

	async function send(e: FormEvent) {
		e.preventDefault();
		if (!selected || !text.trim() || busy) return;
		setBusy(true);
		setError(null);
		try {
			await api().post(`/api/chats/${selected}/messages`, { body: text });
			setText("");
			await refreshMessages();
			await refreshChats();
		} catch (err) {
			setError(getErrorMessage(err, "Could not send"));
		} finally {
			setBusy(false);
		}
	}

	async function sendRecommendation() {
		if (!selected || busy) return;
		const price = Number(reco.price.replace(/[^0-9]/g, ""));
		if (!reco.description.trim()) {
			setError("Add a short description for the recommendation.");
			return;
		}
		setBusy(true);
		setError(null);
		try {
			await api().post(`/api/chats/${selected}/messages`, {
				body: reco.description.trim(),
				kind: "recommendation",
				recommendation: {
					inspectionType: reco.inspectionType,
					price,
					description: reco.description.trim(),
					ctaLink: `/book?type=${reco.inspectionType}`,
				},
			});
			setShowReco(false);
			setReco({ inspectionType: "standard", price: "", description: "" });
			await refreshMessages();
		} catch (err) {
			setError(getErrorMessage(err, "Could not send recommendation"));
		} finally {
			setBusy(false);
		}
	}

	async function escalate() {
		if (!selected || busy) return;
		const reason = window.prompt(
			"Escalate this chat to admin. Reason?",
			"",
		);
		if (!reason?.trim()) return;
		setBusy(true);
		setError(null);
		try {
			await api().post(`/api/chats/${selected}/escalate`, {
				reason: reason.trim(),
			});
			await refreshMessages();
			await refreshChats();
		} catch (err) {
			setError(getErrorMessage(err, "Could not escalate"));
		} finally {
			setBusy(false);
		}
	}

	return (
		<PageShell
			eyebrow="Consultant"
			title="Conversations"
			titleEm="in flight"
			navTitle="Consultant"
			subtitle="Guide buyers before they book — recommend a plan, escalate if needed."
			right={
				<Pill tone="gold" dot>
					You're online
				</Pill>
			}
		>
			<Grid>
				<Sidebar>
					<Tabs data-testid="consultant-tabs">
						{TABS.map((t) => (
							<Tab
								key={t}
								$on={tab === t}
								onClick={() => setTab(t)}
								type="button"
							>
								{t} ({byTab[t].length})
							</Tab>
						))}
					</Tabs>
					{rows.length === 0 && (
						<Empty>Nothing here right now.</Empty>
					)}
					{rows.map((c) => (
						<ContactRow
							key={c._id}
							$on={selected === c._id}
							onClick={() => setSelected(c._id)}
						>
							<Avatar
								name={`Buyer ${c.buyerId.slice(-4)}`}
								size={40}
							/>
							<ContactInfo>
								<ContactName>
									Buyer · {c.buyerId.slice(-6)}
								</ContactName>
								<ContactMeta>
									{c.lastMessage ?? "No messages yet"}
								</ContactMeta>
							</ContactInfo>
						</ContactRow>
					))}
				</Sidebar>

				<ChatPane>
					{!selected ? (
						<Messages>
							<Empty>Select a conversation to view it.</Empty>
						</Messages>
					) : (
						<>
							<ChatHead>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 12,
									}}
								>
									<Avatar name="Buyer" size={36} />
									<div>
										<div style={{ fontSize: 14 }}>
											Buyer ·{" "}
											{activeChat?.buyerId.slice(-6) ??
												""}
										</div>
										<div
											style={{
												color: "var(--ink-muted)",
												fontSize: 12,
											}}
										>
											{activeChat?.escalatedTo
												? "Escalated"
												: (activeChat?.status ?? "—")}
										</div>
									</div>
								</div>
								<div style={{ display: "flex", gap: 8 }}>
									<Button
										type="button"
										variant="secondary"
										size="sm"
										onClick={() => setShowReco((s) => !s)}
									>
										Recommend
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										disabled={
											busy || !!activeChat?.escalatedTo
										}
										onClick={escalate}
									>
										Escalate
									</Button>
								</div>
							</ChatHead>

							<Messages data-testid="consultant-messages">
								{messages.length === 0 && (
									<Empty>No messages yet.</Empty>
								)}
								{messages.map((m) => {
									const mine = m.senderId === myId;
									if (
										m.kind === "recommendation" &&
										m.recommendation
									) {
										return (
											<RecoCard key={m._id} $mine={mine}>
												<Eyebrow
													$gold
													style={{ marginBottom: 6 }}
												>
													Recommended:{" "}
													{
														m.recommendation
															.inspectionType
													}
												</Eyebrow>
												<div
													style={{
														fontSize: 14,
														marginBottom: 6,
													}}
												>
													{m.recommendation
														.description || m.body}
												</div>
												<div
													style={{
														color: "var(--gold-bright)",
														fontSize: 13,
													}}
												>
													{naira(
														m.recommendation.price,
													)}
												</div>
											</RecoCard>
										);
									}
									if (m.kind === "escalation") {
										return (
											<SystemLine key={m._id}>
												Escalated to admin: {m.body}
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

							{showReco && (
								<Panel>
									<label>
										Inspection type
										<select
											value={reco.inspectionType}
											onChange={(e) =>
												setReco((r) => ({
													...r,
													inspectionType:
														e.target.value,
												}))
											}
										>
											<option value="standard">
												Standard
											</option>
											<option value="premium">
												Premium
											</option>
											<option value="special_request">
												Special request
											</option>
										</select>
									</label>
									<label>
										Price (₦)
										<input
											inputMode="numeric"
											value={reco.price}
											onChange={(e) =>
												setReco((r) => ({
													...r,
													price: e.target.value,
												}))
											}
											placeholder="e.g. 52,000"
										/>
									</label>
									<label>
										Description
										<textarea
											rows={2}
											value={reco.description}
											onChange={(e) =>
												setReco((r) => ({
													...r,
													description: e.target.value,
												}))
											}
											placeholder="Why this plan fits…"
										/>
									</label>
									<Button
										type="button"
										variant="primary"
										size="sm"
										disabled={busy}
										onClick={sendRecommendation}
									>
										Send recommendation
									</Button>
								</Panel>
							)}

							<Composer onSubmit={send}>
								<Input
									placeholder="Type your reply…"
									value={text}
									onChange={(e) => setText(e.target.value)}
									disabled={busy}
								/>
								<Button
									type="submit"
									variant="primary"
									size="sm"
									iconRight="send"
									disabled={!text.trim() || busy}
								>
									Send
								</Button>
							</Composer>
						</>
					)}
				</ChatPane>
			</Grid>
		</PageShell>
	);
}
