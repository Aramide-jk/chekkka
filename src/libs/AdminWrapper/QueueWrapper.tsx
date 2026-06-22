"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import useSWR, { mutate as globalMutate } from "swr";
import { Button, Card, Eyebrow, Pill, type PillTone } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { PageShell } from "@/layouts";
import type { IResponseEnvelope } from "@/types";

export type QueueKind =
	| "inspectors"
	| "special-requests"
	| "disputes"
	| "broker-requests"
	| "overdue"
	| "live";

interface IProps {
	kind: QueueKind;
}

const COPY: Record<
	QueueKind,
	{ eyebrow: string; title: string; titleEm: string; subtitle: string }
> = {
	inspectors: {
		eyebrow: "Inspector applications",
		title: "Approve",
		titleEm: "inspectors",
		subtitle: "Review documents and approve, reject, or request more info.",
	},
	"special-requests": {
		eyebrow: "Special requests",
		title: "Special",
		titleEm: "requests",
		subtitle:
			"Cars that need a custom inspection — review, assign, and price.",
	},
	disputes: {
		eyebrow: "Disputes",
		title: "Open",
		titleEm: "disputes",
		subtitle:
			"Buyer-reported issues with completed inspections. Resolution window: 48 h.",
	},
	"broker-requests": {
		eyebrow: "Broker requests",
		title: "Broker",
		titleEm: "queue",
		subtitle: "Assign a broker so the buyer can take it from there.",
	},
	overdue: {
		eyebrow: "Overdue reports",
		title: "Overdue",
		titleEm: "reports",
		subtitle:
			"Reports past their 48 h deadline. Remind, reassign, or flag the inspector.",
	},
	live: {
		eyebrow: "Live monitoring",
		title: "Live",
		titleEm: "inspections",
		subtitle: "All inspections currently in progress across Nigeria.",
	},
};

const Section = styled(Card)`padding: 24px;`;
const Row = styled.div`
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 14px 0;
    border-bottom: 1px solid var(--hairline);
    font-size: 13px;
    &:last-child { border-bottom: none; }
    @media (max-width: 720px) {
        grid-template-columns: 1fr;
    }
`;
const RowName = styled.div`font-size: 14px;`;
const RowMeta = styled.div`color: var(--ink-muted);`;
const Empty = styled.div`
    color: var(--ink-muted);
    padding: 24px 0;
    text-align: center;
    font-size: 13px;
`;
const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(8, 8, 6, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
`;
const Modal = styled(Card)`
    width: 100%;
    max-width: 480px;
    padding: 26px;
    max-height: 90vh;
    overflow-y: auto;
`;
const ModalField = styled.label`
    display: block;
    margin: 0 0 14px;
    span {
        display: block;
        color: var(--ink-soft);
        font-size: 12px;
        margin-bottom: 6px;
    }
    input, select {
        width: 100%;
        padding: 10px 12px;
        background: var(--surface-2);
        border: 1px solid var(--hairline-strong);
        border-radius: var(--r-sm);
        color: var(--ink);
        font-family: var(--sans);
        font-size: 14px;
    }
`;
const ModalErr = styled.div`
    color: var(--danger);
    font-size: 13px;
    margin-bottom: 12px;
`;

interface IInspectorOption {
	userId: string;
	user?: { fullName?: string; city?: string };
}

function DisputeModal({
	row,
	onClose,
	onDone,
}: {
	row: IRow;
	onClose: () => void;
	onDone: () => void;
}) {
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	async function resolve(resolution: "buyer" | "inspector" | "closed") {
		if (busy) return;
		setBusy(true);
		setErr(null);
		try {
			await api().post(`/api/admin/disputes/${row.id}/resolve`, {
				resolution,
			});
			globalMutate(DISPUTES_KEY);
			onDone();
		} catch (e) {
			setErr(getErrorMessage(e, "Could not resolve dispute"));
			setBusy(false);
		}
	}

	return (
		<Overlay
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<Modal>
				<Eyebrow $gold style={{ marginBottom: 10 }}>
					Resolve dispute
				</Eyebrow>
				<p
					style={{
						color: "var(--ink-soft)",
						fontSize: 14,
						marginBottom: 18,
					}}
				>
					{row.name}
				</p>
				{err && <ModalErr>{err}</ModalErr>}
				<div
					style={{ display: "flex", flexDirection: "column", gap: 8 }}
				>
					<Button
						variant="primary"
						size="md"
						disabled={busy}
						onClick={() => resolve("buyer")}
					>
						Resolve for buyer (refund)
					</Button>
					<Button
						variant="secondary"
						size="md"
						disabled={busy}
						onClick={() => resolve("inspector")}
					>
						Uphold report (favour inspector)
					</Button>
					<Button
						variant="ghost"
						size="md"
						disabled={busy}
						onClick={() => resolve("closed")}
					>
						Close without action
					</Button>
				</div>
			</Modal>
		</Overlay>
	);
}

function SpecialRequestModal({
	row,
	onClose,
	onDone,
}: {
	row: IRow;
	onClose: () => void;
	onDone: () => void;
}) {
	const { data } = useSWR<
		IResponseEnvelope<{ inspectors: IInspectorOption[] }>
	>("/api/inspectors?limit=50", fetcher, { revalidateOnMount: true });
	const inspectors = data?.data?.inspectors ?? [];
	const [inspectorId, setInspectorId] = useState("");
	const [price, setPrice] = useState("");
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	async function assign() {
		if (busy) return;
		const customPrice = Number(price.replace(/[^0-9]/g, ""));
		if (!inspectorId) {
			setErr("Pick an inspector.");
			return;
		}
		if (!customPrice || customPrice <= 0) {
			setErr("Enter a price.");
			return;
		}
		setBusy(true);
		setErr(null);
		try {
			await api().post(`/api/admin/special-requests/${row.id}/assign`, {
				inspectorId,
				customPrice,
			});
			globalMutate(SR_KEY);
			onDone();
		} catch (e) {
			setErr(getErrorMessage(e, "Could not assign special request"));
			setBusy(false);
		}
	}

	return (
		<Overlay
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<Modal>
				<Eyebrow $gold style={{ marginBottom: 10 }}>
					Assign special request
				</Eyebrow>
				<p
					style={{
						color: "var(--ink-soft)",
						fontSize: 14,
						marginBottom: 18,
					}}
				>
					{row.name}
				</p>
				{err && <ModalErr>{err}</ModalErr>}
				<ModalField>
					<span>Inspector</span>
					<select
						value={inspectorId}
						onChange={(e) => setInspectorId(e.target.value)}
					>
						<option value="">Select an inspector…</option>
						{inspectors.map((i) => (
							<option key={i.userId} value={i.userId}>
								{i.user?.fullName ?? i.userId}
								{i.user?.city ? ` · ${i.user.city}` : ""}
							</option>
						))}
					</select>
				</ModalField>
				<ModalField>
					<span>Custom price (₦)</span>
					<input
						inputMode="numeric"
						value={price}
						onChange={(e) => setPrice(e.target.value)}
						placeholder="e.g. 75,000"
					/>
				</ModalField>
				<div style={{ display: "flex", gap: 10 }}>
					<Button
						variant="primary"
						size="md"
						fullWidth
						disabled={busy}
						onClick={assign}
					>
						{busy ? "Assigning…" : "Assign & price"}
					</Button>
					<Button variant="secondary" size="md" onClick={onClose}>
						Cancel
					</Button>
				</div>
			</Modal>
		</Overlay>
	);
}

function relTime(d?: string | Date) {
	if (!d) return "—";
	const t = typeof d === "string" ? new Date(d).getTime() : d.getTime();
	const diff = Date.now() - t;
	if (diff < 60_000) return "just now";
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
	if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
	return `${Math.floor(diff / 86_400_000)} d ago`;
}

interface IRow {
	id: string;
	name: string;
	city?: string;
	exp?: string;
	since?: string;
	tone: PillTone;
	action?: () => Promise<void>;
	actionLabel?: string;
	// Rows that need extra input open a modal instead of running inline.
	interactive?: "dispute" | "special";
}

const SR_KEY = "/api/admin/special-requests";
const DISPUTES_KEY = "/api/admin/disputes";
const BROKER_KEY = "/api/admin/broker-requests";

function useInspectorsQueue() {
	const { data, mutate } = useSWR<
		IResponseEnvelope<{ applications: Array<Record<string, unknown>> }>
	>("/api/admin/inspectors", fetcher, { revalidateOnMount: true });
	const items = data?.data?.applications ?? [];
	return useMemo<IRow[]>(
		() =>
			items.map((a) => {
				const user = (a.user as Record<string, unknown>) ?? {};
				const userId = String(user._id ?? "");
				return {
					id: userId,
					name: String(user.fullName ?? "Unknown"),
					city: String(user.city ?? ""),
					exp: `${a.yearsExperience ?? 0} yrs`,
					since: relTime(String(a.createdAt ?? "")),
					tone: "gold" as PillTone,
					action: async () => {
						await api().patch(`/api/admin/inspectors/${userId}`, {
							action: "approve",
						});
						mutate();
					},
					actionLabel: "Approve",
				};
			}),
		[items, mutate],
	);
}

function useInspectionsQueue(filter: string, remindable = false) {
	const key = `/api/admin/inspections?${filter}`;
	const { data, mutate } = useSWR<
		IResponseEnvelope<{ inspections: Array<Record<string, unknown>> }>
	>(key, fetcher, { revalidateOnMount: true });
	const items = data?.data?.inspections ?? [];
	return useMemo<IRow[]>(
		() =>
			items.map((i) => {
				const car = (i.car as Record<string, unknown>) ?? {};
				const id = String(i._id ?? "");
				return {
					id,
					name:
						`${car.make ?? ""} ${car.model ?? ""} ${car.year ?? ""}`.trim() ||
						"Inspection",
					city: String(car.city ?? ""),
					exp: String(i.currentSection ?? i.status ?? ""),
					since: `${i.photoCount ?? 0} photos`,
					tone: "gold" as PillTone,
					...(remindable
						? {
								actionLabel: "Remind",
								action: async () => {
									await api().post(
										`/api/admin/inspections/${id}/remind`,
										{},
									);
									mutate();
								},
							}
						: {}),
				};
			}),
		[items, remindable, mutate],
	);
}

function useSpecialRequests() {
	const { data } = useSWR<
		IResponseEnvelope<{ inspections: Array<Record<string, unknown>> }>
	>(`/api/admin/special-requests`, fetcher, { revalidateOnMount: true });
	const items = data?.data?.inspections ?? [];
	return useMemo<IRow[]>(
		() =>
			items.map((i) => {
				const car = (i.car as Record<string, unknown>) ?? {};
				return {
					id: String(i._id ?? ""),
					name:
						`${car.make ?? ""} ${car.model ?? ""} ${car.year ?? ""}`.trim() ||
						"Special request",
					city: String(car.city ?? ""),
					exp: `Buyer ${i.buyerId ?? ""}`,
					since: relTime(String(i.createdAt ?? "")),
					tone: "info" as PillTone,
					interactive: "special" as const,
					actionLabel: "Assign",
				};
			}),
		[items],
	);
}

function useDisputes() {
	const { data } = useSWR<
		IResponseEnvelope<{ disputes: Array<Record<string, unknown>> }>
	>(`/api/admin/disputes`, fetcher, { revalidateOnMount: true });
	const items = data?.data?.disputes ?? [];
	return useMemo<IRow[]>(
		() =>
			items.map((d) => ({
				id: String(d._id ?? ""),
				name: String(d.statement ?? "Dispute"),
				city: String(d.status ?? "open"),
				exp: String(d.raisedBy ?? ""),
				since: relTime(String(d.createdAt ?? "")),
				tone: "danger" as PillTone,
				interactive: "dispute" as const,
				actionLabel: "Resolve",
			})),
		[items],
	);
}

function useBrokerRequests() {
	const { data, mutate } = useSWR<
		IResponseEnvelope<{ requests: Array<Record<string, unknown>> }>
	>(BROKER_KEY, fetcher, { revalidateOnMount: true });
	const items = data?.data?.requests ?? [];
	return useMemo<IRow[]>(
		() =>
			items.map((r) => {
				const id = String(r._id ?? "");
				const assigned = !!r.brokerId;
				return {
					id,
					name: `Broker request`,
					city: String(r.deliveryAddress ?? ""),
					exp: `₦${Number(r.budget ?? 0).toLocaleString()} budget`,
					since: relTime(String(r.createdAt ?? "")),
					tone: assigned
						? ("good" as PillTone)
						: ("info" as PillTone),
					...(assigned
						? {}
						: {
								actionLabel: "Assign to me",
								action: async () => {
									await api().post(
										`/api/admin/broker-requests/${id}/assign`,
										{},
									);
									mutate();
								},
							}),
				};
			}),
		[items, mutate],
	);
}

export default function AdminQueueWrapper({ kind }: IProps) {
	const c = COPY[kind];
	const inspectors = useInspectorsQueue();
	const specialRequests = useSpecialRequests();
	const disputes = useDisputes();
	const brokerRequests = useBrokerRequests();
	const overdue = useInspectionsQueue("filter=overdue", true);
	const liveQueue = useInspectionsQueue("status=in_progress");

	const [liveRealtime, setLiveRealtime] = useState<IRow[]>([]);
	const esRef = useRef<EventSource | null>(null);

	useEffect(() => {
		if (kind !== "live" || typeof window === "undefined") return;
		const es = new EventSource("/api/admin/inspections/live");
		esRef.current = es;
		es.addEventListener("snapshot", (ev) => {
			try {
				const data = JSON.parse((ev as MessageEvent).data) as {
					inspections: Array<Record<string, unknown>>;
				};
				setLiveRealtime(
					data.inspections.map((i) => {
						const car = (i.car as Record<string, unknown>) ?? {};
						return {
							id: String(i._id ?? ""),
							name:
								`${car.make ?? ""} ${car.model ?? ""} ${car.year ?? ""}`.trim() ||
								"Inspection",
							city: String(car.city ?? ""),
							exp: String(i.currentSection ?? "in progress"),
							since: `${i.photoCount ?? 0} photos`,
							tone: "gold" as PillTone,
						};
					}),
				);
			} catch {
				// ignore
			}
		});
		// Incremental deltas (new photo, section change) keep the snapshot live
		// instead of only updating on a full reconnect.
		es.addEventListener("event", (ev) => {
			try {
				const payload = JSON.parse((ev as MessageEvent).data) as Record<
					string,
					unknown
				>;
				const insId = String(payload.inspectionId ?? "");
				if (!insId) return;
				const isPhoto =
					payload.kind === "photo" || payload.type === "photo";
				const isSection =
					payload.kind === "section" || payload.type === "section";
				setLiveRealtime((prev) =>
					prev.map((r) => {
						if (r.id !== insId) return r;
						if (isPhoto) {
							const n = Number.parseInt(r.since ?? "0", 10) || 0;
							return { ...r, since: `${n + 1} photos` };
						}
						if (isSection) {
							return {
								...r,
								exp: String(payload.section ?? r.exp),
							};
						}
						return r;
					}),
				);
			} catch {
				// ignore
			}
		});
		return () => es.close();
	}, [kind]);

	const rows: IRow[] = useMemo(() => {
		if (kind === "inspectors") return inspectors;
		if (kind === "special-requests") return specialRequests;
		if (kind === "disputes") return disputes;
		if (kind === "broker-requests") return brokerRequests;
		if (kind === "overdue") return overdue;
		return liveRealtime.length > 0 ? liveRealtime : liveQueue;
	}, [
		kind,
		inspectors,
		specialRequests,
		disputes,
		brokerRequests,
		overdue,
		liveRealtime,
		liveQueue,
	]);

	const [error, setError] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [modalRow, setModalRow] = useState<IRow | null>(null);

	async function runAction(r: IRow) {
		if (r.interactive) {
			setModalRow(r);
			return;
		}
		if (!r.action) return;
		setBusyId(r.id);
		setError(null);
		try {
			await r.action();
		} catch (err) {
			setError(getErrorMessage(err, "Could not complete action"));
		} finally {
			setBusyId(null);
		}
	}

	return (
		<PageShell
			eyebrow={c.eyebrow}
			title={c.title}
			titleEm={c.titleEm}
			navTitle={`Admin · ${kind}`}
			subtitle={c.subtitle}
		>
			<Section data-testid={`queue-${kind}`}>
				<Eyebrow $gold style={{ marginBottom: 14 }}>
					Open ({rows.length})
				</Eyebrow>
				{rows.length === 0 && <Empty>Queue is empty.</Empty>}
				{rows.map((r) => (
					<Row key={r.id || r.name}>
						<RowName>{r.name}</RowName>
						<RowMeta>{r.city}</RowMeta>
						<RowMeta>{r.exp}</RowMeta>
						<Pill tone={r.tone}>{r.since}</Pill>
						{r.action || r.interactive ? (
							<Button
								variant="secondary"
								size="sm"
								onClick={() => runAction(r)}
								disabled={busyId === r.id}
							>
								{busyId === r.id
									? "…"
									: (r.actionLabel ?? "Review")}
							</Button>
						) : (
							<Button variant="secondary" size="sm" disabled>
								Review
							</Button>
						)}
					</Row>
				))}
				{error && (
					<div
						role="alert"
						style={{
							marginTop: 14,
							color: "var(--danger)",
							fontSize: 13,
						}}
					>
						{error}
					</div>
				)}
			</Section>

			{modalRow?.interactive === "dispute" && (
				<DisputeModal
					row={modalRow}
					onClose={() => setModalRow(null)}
					onDone={() => setModalRow(null)}
				/>
			)}
			{modalRow?.interactive === "special" && (
				<SpecialRequestModal
					row={modalRow}
					onClose={() => setModalRow(null)}
					onDone={() => setModalRow(null)}
				/>
			)}
		</PageShell>
	);
}
