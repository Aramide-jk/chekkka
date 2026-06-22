"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import useSWR, { mutate as globalMutate } from "swr";
import {
	Avatar,
	Button,
	Card,
	Eyebrow,
	Icon,
	Pill,
	type PillTone,
} from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { PageShell } from "@/layouts";
import type { IResponseEnvelope } from "@/types";

type StatusFilter = "pending" | "approved" | "suspended" | "rejected" | "all";

type InspectorStatus =
	| "pending"
	| "approved"
	| "rejected"
	| "suspended"
	| "active";

interface IRawInspector {
	_id: string;
	userId: string;
	yearsExperience: number;
	rating: number;
	totalCompleted: number;
	specialisations?: string[];
	bio?: string;
	documents?: {
		idDocument?: string;
		certificate?: string;
		extra?: string;
	};
	availability?: { toggleOn?: boolean };
	createdAt: string;
	updatedAt?: string;
	user: {
		_id: string;
		fullName: string;
		email: string;
		phone?: string;
		city?: string;
		status: InspectorStatus;
	};
}

interface IPendingApplication {
	_id: string;
	userId: string;
	yearsExperience?: number;
	specialisations?: string[];
	bio?: string;
	documents?: {
		idDocument?: string;
		certificate?: string;
		extra?: string;
	};
	availability?: { toggleOn?: boolean };
	createdAt?: string;
	updatedAt?: string;
	user?: {
		_id?: string;
		fullName?: string;
		email?: string;
		phone?: string;
		city?: string;
	};
}

type AdminInspectorAction = "approve" | "reject" | "suspend" | "reactivate";

const FILTERS: Array<{
	value: StatusFilter;
	label: string;
}> = [
	{ value: "pending", label: "Pending" },
	{ value: "approved", label: "Approved" },
	{ value: "suspended", label: "Suspended" },
	{ value: "rejected", label: "Rejected" },
	{ value: "all", label: "All" },
];

const STATUS_TONE: Record<InspectorStatus, PillTone> = {
	pending: "info",
	approved: "good",
	rejected: "danger",
	suspended: "caution",
	active: "good",
};

const Section = styled(Card)`
    padding: 24px;
`;

const FiltersRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 18px;
`;

const FilterChip = styled.button<{ $active: boolean }>`
    border: 1px solid
        ${(p) => (p.$active ? "var(--gold)" : "var(--hairline)")};
    background: ${(p) =>
		p.$active ? "rgba(212, 175, 55, 0.12)" : "transparent"};
    color: ${(p) => (p.$active ? "var(--gold-bright)" : "var(--ink-soft)")};
    padding: 7px 14px;
    border-radius: var(--r-pill);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;

    &:hover {
        color: var(--gold-bright);
    }
`;

const Row = styled.button`
    display: grid;
    grid-template-columns: 40px 2fr 1fr 1fr 1fr 24px;
    align-items: center;
    gap: 12px;
    padding: 14px 6px;
    border: none;
    border-bottom: 1px solid var(--hairline);
    background: transparent;
    width: 100%;
    text-align: left;
    color: var(--ink);
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
        background: var(--surface-2);
    }

    &:last-of-type {
        border-bottom: none;
    }

    @media (max-width: 900px) {
        grid-template-columns: 40px 1fr auto;
    }
`;

const RowName = styled.div`
    font-size: 14px;
`;

const RowMeta = styled.div`
    color: var(--ink-muted);
`;

const RowChevron = styled.div`
    color: var(--ink-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
`;

const Empty = styled.div`
    color: var(--ink-muted);
    padding: 24px 0;
    text-align: center;
    font-size: 13px;
`;

const Modal = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 16px;
`;

const ModalCard = styled(Card)`
    padding: 24px;
    max-width: 640px;
    width: 100%;
    max-height: 86vh;
    overflow-y: auto;
`;

const ModalHead = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
    flex-wrap: wrap;
`;

const ModalTitle = styled.div`
    font-family: var(--display);
    font-size: 22px;
    line-height: 1.1;
`;

const ModalSubtitle = styled.div`
    color: var(--ink-muted);
    font-size: 13px;
    margin-top: 2px;
`;

const DetailGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 24px;

    @media (max-width: 560px) {
        grid-template-columns: 1fr;
    }
`;

const DetailRow = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid var(--hairline);
    font-size: 13px;

    span:first-child {
        color: var(--ink-muted);
    }

    span:last-child {
        color: var(--ink);
        text-align: right;
        word-break: break-word;
    }
`;

const SectionLabel = styled.div`
    margin-top: 18px;
    margin-bottom: 10px;
    color: var(--ink-muted);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
`;

const Bio = styled.p`
    margin: 0;
    font-size: 14px;
    line-height: 1.55;
    color: var(--ink);
    white-space: pre-wrap;
`;

const Tags = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const DocList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const DocChip = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    border: 1px solid var(--hairline);
    border-radius: var(--r-sm);
    padding: 10px 12px;
    font-size: 13px;
`;

const ModalActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 24px;
    flex-wrap: wrap;
`;

function initials(name?: string): string {
	if (!name) return "?";
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function relTime(d?: string) {
	if (!d) return "—";
	const diff = Date.now() - new Date(d).getTime();
	if (diff < 60_000) return "just now";
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
	if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
	return `${Math.floor(diff / 86_400_000)} d ago`;
}

function formatDate(d?: string): string {
	if (!d) return "—";
	const date = new Date(d);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function pendingToInspector(p: IPendingApplication): IRawInspector {
	return {
		_id: p._id,
		userId: p.userId,
		yearsExperience: p.yearsExperience ?? 0,
		rating: 0,
		totalCompleted: 0,
		specialisations: p.specialisations,
		bio: p.bio,
		documents: p.documents,
		availability: p.availability,
		createdAt: p.createdAt ?? "",
		updatedAt: p.updatedAt,
		user: {
			_id: p.user?._id ?? p.userId,
			fullName: p.user?.fullName ?? "Unknown",
			email: p.user?.email ?? "",
			phone: p.user?.phone,
			city: p.user?.city,
			status: "pending",
		},
	};
}

export default function InspectorsWrapper() {
	const [filter, setFilter] = useState<StatusFilter>("pending");
	const [selectedId, setSelectedId] = useState<string | null>(null);

	// Pending applications use the legacy no-param endpoint (cached). Every
	// other filter goes through the new `status=` path that returns the full
	// roster.
	const swrKey =
		filter === "pending"
			? "/api/admin/inspectors"
			: `/api/admin/inspectors?status=${filter}`;

	const { data, isLoading } = useSWR<
		IResponseEnvelope<{
			applications?: IPendingApplication[];
			inspectors?: IRawInspector[];
		}>
	>(swrKey, fetcher, { revalidateOnMount: true });

	const rows = useMemo<IRawInspector[]>(() => {
		if (filter === "pending") {
			return (data?.data?.applications ?? []).map(pendingToInspector);
		}
		return data?.data?.inspectors ?? [];
	}, [filter, data]);

	const selected = useMemo(
		() => rows.find((r) => (r.user._id || r.userId) === selectedId) ?? null,
		[rows, selectedId],
	);

	return (
		<PageShell
			eyebrow="Inspectors"
			title="Manage"
			titleEm="inspectors"
			navTitle="Admin · Inspectors"
			subtitle="Approve applications, suspend bad actors, reactivate when appropriate."
		>
			<Section data-testid="admin-inspectors">
				<FiltersRow>
					{FILTERS.map((f) => (
						<FilterChip
							key={f.value}
							$active={filter === f.value}
							onClick={() => setFilter(f.value)}
						>
							{f.label}
						</FilterChip>
					))}
				</FiltersRow>

				<Eyebrow $gold style={{ marginBottom: 14 }}>
					{isLoading ? "Loading…" : `Results (${rows.length})`}
				</Eyebrow>

				{!isLoading && rows.length === 0 && (
					<Empty>No inspectors match this filter.</Empty>
				)}

				{rows.map((insp) => {
					const userId = insp.user._id || insp.userId;
					const status = insp.user.status;
					return (
						<Row
							key={insp._id || userId}
							type="button"
							onClick={() => setSelectedId(userId)}
							aria-label={`Open details for ${insp.user.fullName}`}
						>
							<Avatar
								name={initials(insp.user.fullName)}
								size={36}
							/>
							<div>
								<RowName>{insp.user.fullName}</RowName>
								<RowMeta>{insp.user.email}</RowMeta>
							</div>
							<RowMeta>{insp.user.city ?? "—"}</RowMeta>
							<RowMeta>
								{insp.yearsExperience} yrs · ★{" "}
								{Number(insp.rating || 0).toFixed(1)}
							</RowMeta>
							<Pill tone={STATUS_TONE[status]}>
								{status === "active" ? "approved" : status}
							</Pill>
							<RowChevron>
								<Icon name="chevron-right" size={16} />
							</RowChevron>
						</Row>
					);
				})}
			</Section>

			{selected && (
				<InspectorDetailModal
					inspector={selected}
					onClose={() => setSelectedId(null)}
					onMutated={() => globalMutate(swrKey)}
				/>
			)}
		</PageShell>
	);
}

function InspectorDetailModal({
	inspector,
	onClose,
	onMutated,
}: {
	inspector: IRawInspector;
	onClose: () => void;
	onMutated: () => Promise<unknown>;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onClose]);

	const userId = inspector.user._id || inspector.userId;
	const status = inspector.user.status;
	const docs = inspector.documents ?? {};
	const docEntries = (
		[
			["ID document", docs.idDocument],
			["Certificate", docs.certificate],
			["Extra document", docs.extra],
		] as const
	).filter(([, v]) => !!v) as Array<[string, string]>;

	async function act(action: AdminInspectorAction) {
		if (
			(action === "reject" || action === "suspend") &&
			typeof window !== "undefined" &&
			!window.confirm(
				`${action[0].toUpperCase()}${action.slice(1)} ${inspector.user.fullName}? They will be notified.`,
			)
		) {
			return;
		}
		setBusy(true);
		setError(null);
		try {
			await api().patch(`/api/admin/inspectors/${userId}`, { action });
			await onMutated();
			onClose();
		} catch (e) {
			setError(getErrorMessage(e, "Could not update inspector"));
			setBusy(false);
		}
	}

	return (
		<Modal onClick={onClose}>
			<ModalCard
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-label={`Inspector details for ${inspector.user.fullName}`}
			>
				<ModalHead>
					<Avatar
						name={initials(inspector.user.fullName)}
						size={56}
					/>
					<div style={{ flex: 1, minWidth: 0 }}>
						<ModalTitle>{inspector.user.fullName}</ModalTitle>
						<ModalSubtitle>{inspector.user.email}</ModalSubtitle>
					</div>
					<Pill tone={STATUS_TONE[status]}>
						{status === "active" ? "approved" : status}
					</Pill>
				</ModalHead>

				<SectionLabel>Contact</SectionLabel>
				<DetailGrid>
					<DetailRow>
						<span>Phone</span>
						<span>{inspector.user.phone || "—"}</span>
					</DetailRow>
					<DetailRow>
						<span>City</span>
						<span>{inspector.user.city || "—"}</span>
					</DetailRow>
				</DetailGrid>

				<SectionLabel>Performance</SectionLabel>
				<DetailGrid>
					<DetailRow>
						<span>Years experience</span>
						<span>{inspector.yearsExperience} yrs</span>
					</DetailRow>
					<DetailRow>
						<span>Rating</span>
						<span>
							★ {Number(inspector.rating || 0).toFixed(1)}
						</span>
					</DetailRow>
					<DetailRow>
						<span>Completed jobs</span>
						<span>{inspector.totalCompleted}</span>
					</DetailRow>
					<DetailRow>
						<span>Availability</span>
						<span>
							{inspector.availability?.toggleOn
								? "On"
								: status === "approved" || status === "active"
									? "Off"
									: "—"}
						</span>
					</DetailRow>
					<DetailRow>
						<span>Applied</span>
						<span>
							{formatDate(inspector.createdAt)} ·{" "}
							{relTime(inspector.createdAt)}
						</span>
					</DetailRow>
					<DetailRow>
						<span>Last updated</span>
						<span>
							{formatDate(
								inspector.updatedAt ?? inspector.createdAt,
							)}
						</span>
					</DetailRow>
				</DetailGrid>

				{inspector.specialisations &&
					inspector.specialisations.length > 0 && (
						<>
							<SectionLabel>Specialisations</SectionLabel>
							<Tags>
								{inspector.specialisations.map((s) => (
									<Pill key={s} tone="ghost">
										{s}
									</Pill>
								))}
							</Tags>
						</>
					)}

				{inspector.bio && (
					<>
						<SectionLabel>Bio</SectionLabel>
						<Bio>{inspector.bio}</Bio>
					</>
				)}

				<SectionLabel>Documents</SectionLabel>
				{docEntries.length === 0 ? (
					<div
						style={{
							color: "var(--ink-muted)",
							fontSize: 13,
						}}
					>
						No documents on file.
					</div>
				) : (
					<DocList>
						{docEntries.map(([label, key]) => (
							<DocChip key={label}>
								<span>{label}</span>
								<span
									style={{
										color: "var(--ink-muted)",
										fontSize: 12,
									}}
								>
									{key.split("/").pop()}
								</span>
							</DocChip>
						))}
					</DocList>
				)}

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

				<ModalActions>
					<Button variant="ghost" size="sm" onClick={onClose}>
						Close
					</Button>
					{status === "pending" && (
						<>
							<Button
								variant="ghost"
								size="sm"
								disabled={busy}
								onClick={() => act("reject")}
							>
								Reject
							</Button>
							<Button
								variant="primary"
								size="sm"
								disabled={busy}
								onClick={() => act("approve")}
							>
								{busy ? "Working…" : "Approve"}
							</Button>
						</>
					)}
					{(status === "approved" || status === "active") && (
						<Button
							variant="ghost"
							size="sm"
							disabled={busy}
							onClick={() => act("suspend")}
						>
							{busy ? "Working…" : "Suspend"}
						</Button>
					)}
					{status === "suspended" && (
						<Button
							variant="primary"
							size="sm"
							disabled={busy}
							onClick={() => act("reactivate")}
						>
							{busy ? "Working…" : "Reactivate"}
						</Button>
					)}
					{status === "rejected" && (
						<Button
							variant="ghost"
							size="sm"
							disabled={busy}
							onClick={() => act("approve")}
						>
							{busy ? "Working…" : "Re-approve"}
						</Button>
					)}
				</ModalActions>
			</ModalCard>
		</Modal>
	);
}
