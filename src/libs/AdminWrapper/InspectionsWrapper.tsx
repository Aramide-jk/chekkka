"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";
import useSWR, { mutate as globalMutate } from "swr";
import { Button, Card, Eyebrow, Pill, type PillTone } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { PageShell } from "@/layouts";
import type { InspectionStatus, IResponseEnvelope } from "@/types";

type StatusFilter = InspectionStatus | "any";

interface IRawInspection {
	_id: string;
	status: InspectionStatus;
	inspectionType: string;
	car: {
		make: string;
		model: string;
		year: number;
		city: string;
		address?: string;
	};
	buyerId: string;
	assignedInspectorId?: string | null;
	inspectorId?: string | null;
	price: number;
	scheduledFor?: string;
	createdAt: string;
}

interface IInspector {
	userId: string;
	user?: { fullName?: string; city?: string };
	rating?: number;
}

const FILTERS: Array<{ value: StatusFilter; label: string; tone: PillTone }> = [
	{ value: "any", label: "All", tone: "ghost" },
	{ value: "submitted", label: "Submitted", tone: "info" },
	{ value: "assigned", label: "Assigned", tone: "gold" },
	{ value: "declined", label: "Declined", tone: "danger" },
	{ value: "scheduled", label: "Scheduled", tone: "info" },
	{ value: "in_progress", label: "In progress", tone: "gold" },
	{ value: "report_processing", label: "Report processing", tone: "caution" },
	{ value: "completed", label: "Completed", tone: "good" },
];

const TONE_BY_STATUS: Record<InspectionStatus, PillTone> = {
	submitted: "info",
	assigned: "gold",
	declined: "danger",
	scheduled: "info",
	in_progress: "gold",
	report_processing: "caution",
	completed: "good",
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

const Row = styled.div`
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 14px 0;
    border-bottom: 1px solid var(--hairline);
    font-size: 13px;
    &:last-child {
        border-bottom: none;
    }

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
    }
`;

const RowName = styled.div`
    font-size: 14px;
`;

const RowMeta = styled.div`
    color: var(--ink-muted);
`;

const Empty = styled.div`
    color: var(--ink-muted);
    padding: 24px 0;
    text-align: center;
    font-size: 13px;
`;

const RowActions = styled.div`
    display: inline-flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
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
    max-width: 520px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
`;

const InspectorOption = styled.button<{ $active: boolean }>`
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 12px 14px;
    border: 1px solid
        ${(p) => (p.$active ? "var(--gold)" : "var(--hairline)")};
    background: ${(p) =>
		p.$active ? "rgba(212, 175, 55, 0.10)" : "transparent"};
    color: var(--ink);
    border-radius: var(--r-sm);
    margin-bottom: 8px;
    cursor: pointer;
    text-align: left;
    font-size: 13px;

    &:hover {
        background: var(--surface-2);
    }
`;

const ModalActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
`;

function relTime(d?: string) {
	if (!d) return "—";
	const diff = Date.now() - new Date(d).getTime();
	if (diff < 60_000) return "just now";
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
	if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
	return `${Math.floor(diff / 86_400_000)} d ago`;
}

export default function InspectionsWrapper() {
	const [filter, setFilter] = useState<StatusFilter>("any");
	const swrKey = `/api/admin/inspections?status=${filter}&limit=100`;
	const { data, isLoading } = useSWR<
		IResponseEnvelope<{ inspections: IRawInspection[] }>
	>(swrKey, fetcher, { revalidateOnMount: true });
	const items = data?.data?.inspections ?? [];

	const [reassignTarget, setReassignTarget] = useState<IRawInspection | null>(
		null,
	);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function cancel(insp: IRawInspection) {
		if (
			typeof window !== "undefined" &&
			!window.confirm(
				`Cancel inspection ${insp.car.make} ${insp.car.model}? Both parties will be notified.`,
			)
		) {
			return;
		}
		setBusyId(insp._id);
		setError(null);
		try {
			await api().post(`/api/admin/inspections/${insp._id}/cancel`, {});
			await globalMutate(swrKey);
		} catch (e) {
			setError(getErrorMessage(e, "Could not cancel inspection"));
		} finally {
			setBusyId(null);
		}
	}

	return (
		<PageShell
			eyebrow="Inspections"
			title="Manage"
			titleEm="inspections"
			navTitle="Admin · Inspections"
			subtitle="Every inspection across the platform. Reassign, cancel, or drill into a record."
		>
			<Section data-testid="admin-inspections">
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
					{isLoading ? "Loading…" : `Results (${items.length})`}
				</Eyebrow>

				{!isLoading && items.length === 0 && (
					<Empty>No inspections match this filter.</Empty>
				)}

				{items.map((i) => (
					<Row key={i._id}>
						<RowName>
							{i.car.make} {i.car.model} {i.car.year}
						</RowName>
						<RowMeta>{i.car.city}</RowMeta>
						<RowMeta>{relTime(i.createdAt)}</RowMeta>
						<Pill tone={TONE_BY_STATUS[i.status]}>
							{i.status.replace(/_/g, " ")}
						</Pill>
						<RowActions>
							<Button
								variant="secondary"
								size="sm"
								onClick={() => setReassignTarget(i)}
								disabled={
									busyId === i._id || i.status === "completed"
								}
							>
								Reassign
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => cancel(i)}
								disabled={
									busyId === i._id || i.status === "completed"
								}
							>
								Cancel
							</Button>
						</RowActions>
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

			{reassignTarget && (
				<ReassignModal
					inspection={reassignTarget}
					onClose={() => setReassignTarget(null)}
					onDone={async () => {
						setReassignTarget(null);
						await globalMutate(swrKey);
					}}
				/>
			)}
		</PageShell>
	);
}

function ReassignModal({
	inspection,
	onClose,
	onDone,
}: {
	inspection: IRawInspection;
	onClose: () => void;
	onDone: () => Promise<void>;
}) {
	const { data, isLoading } = useSWR<
		IResponseEnvelope<{ inspectors: IInspector[] }>
	>(
		`/api/inspectors?limit=50${inspection.car.city ? `&city=${encodeURIComponent(inspection.car.city)}` : ""}`,
		fetcher,
		{ revalidateOnMount: true },
	);
	const inspectors = data?.data?.inspectors ?? [];
	const candidates = useMemo(
		() =>
			inspectors.filter(
				(p) =>
					p.userId &&
					p.userId !== (inspection.assignedInspectorId ?? ""),
			),
		[inspectors, inspection.assignedInspectorId],
	);
	const [pick, setPick] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function submit() {
		if (!pick) return;
		setBusy(true);
		setError(null);
		try {
			await api().post(
				`/api/admin/inspections/${inspection._id}/reassign`,
				{ inspectorId: pick },
			);
			await onDone();
		} catch (e) {
			setError(getErrorMessage(e, "Could not reassign"));
		} finally {
			setBusy(false);
		}
	}

	return (
		<Modal onClick={onClose}>
			<ModalCard onClick={(e) => e.stopPropagation()}>
				<Eyebrow $gold style={{ marginBottom: 10 }}>
					Reassign inspection
				</Eyebrow>
				<div style={{ fontSize: 14, marginBottom: 16 }}>
					{inspection.car.make} {inspection.car.model} ·{" "}
					{inspection.car.city}
				</div>

				{isLoading && (
					<div style={{ color: "var(--ink-muted)", fontSize: 13 }}>
						Loading inspectors…
					</div>
				)}
				{!isLoading && candidates.length === 0 && (
					<div style={{ color: "var(--ink-muted)", fontSize: 13 }}>
						No available inspectors in {inspection.car.city}.
					</div>
				)}
				{candidates.map((c) => (
					<InspectorOption
						key={c.userId}
						$active={pick === c.userId}
						onClick={() => setPick(c.userId)}
					>
						<span>{c.user?.fullName ?? "Unknown"}</span>
						<span style={{ color: "var(--ink-muted)" }}>
							{c.user?.city ?? "—"} · ★{" "}
							{Number(c.rating ?? 0).toFixed(1)}
						</span>
					</InspectorOption>
				))}

				{error && (
					<div
						role="alert"
						style={{
							marginTop: 10,
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
					<Button
						variant="primary"
						size="sm"
						onClick={submit}
						disabled={!pick || busy}
					>
						{busy ? "Reassigning…" : "Reassign"}
					</Button>
				</ModalActions>
			</ModalCard>
		</Modal>
	);
}
