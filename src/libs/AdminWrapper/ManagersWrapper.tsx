"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import useSWR from "swr";
import { Avatar, Button, Card, Eyebrow, Icon, Pill } from "@/components";
import { api, fetcher, getErrorMessage } from "@/constants";
import { PageShell } from "@/layouts";
import type { IResponseEnvelope } from "@/types";

// Permissions catalogue (mirrored from the server). Grouped here so the
// detail modal can render them as logical sections instead of a flat list —
// makes a long permission set scannable at a glance.
interface PermissionGroup {
	label: string;
	hint: string;
	items: Array<{ key: string; label: string }>;
}
const PERMISSION_GROUPS: PermissionGroup[] = [
	{
		label: "Inspectors",
		hint: "Reviewing and approving inspector applications.",
		items: [
			{ key: "inspectors.view", label: "View inspector applications" },
			{ key: "inspectors.approve", label: "Approve / reject inspectors" },
		],
	},
	{
		label: "Operations",
		hint: "Day-to-day inspection queues and dispute handling.",
		items: [
			{ key: "live.view", label: "View live inspections" },
			{ key: "overdue.view", label: "View overdue reports" },
			{ key: "special_requests.view", label: "View special requests" },
			{ key: "broker_requests.view", label: "View broker requests" },
			{ key: "disputes.view", label: "View disputes" },
			{ key: "disputes.resolve", label: "Resolve disputes" },
		],
	},
	{
		label: "Configuration",
		hint: "Site-wide settings that shape the rest of the platform.",
		items: [
			{ key: "site_config.view", label: "View site settings" },
			{ key: "site_config.edit", label: "Edit site settings" },
		],
	},
	{
		label: "Audit",
		hint: "Read access to the admin audit trail.",
		items: [{ key: "audit.view", label: "View audit log" }],
	},
];

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) =>
	g.items.map((i) => i.key),
);

const PERMISSION_LABEL_BY_KEY = Object.fromEntries(
	PERMISSION_GROUPS.flatMap((g) =>
		g.items.map((i) => [i.key, i.label] as const),
	),
) as Record<string, string>;

const PAGE_SIZE = 9; // 3 × 3 grid on desktop — keeps the layout tidy.

type StatusFilter = "all" | "active" | "suspended" | "pending" | "rejected";

const STATUS_FILTERS: Array<{
	value: StatusFilter;
	label: string;
}> = [
	{ value: "all", label: "All" },
	{ value: "active", label: "Active" },
	{ value: "suspended", label: "Suspended" },
	{ value: "pending", label: "Pending" },
	{ value: "rejected", label: "Rejected" },
];

interface IManager {
	id: string;
	fullName: string;
	username: string;
	email: string;
	phone?: string;
	status: "active" | "pending" | "approved" | "rejected" | "suspended";
	permissions: string[];
	// Invite lifecycle. `inviteToken` is NEVER on this shape — it's returned
	// only once when the admin creates/resends the invite. The flags below
	// drive the "pending" badge and the "permissions locked" affordance.
	invitedAt?: string;
	inviteTokenExpiresAt?: string;
	inviteAcceptedAt?: string;
	inviteRejectedAt?: string;
	hasOutstandingInvite?: boolean;
	createdAt: string;
	updatedAt: string;
}

interface IIssuedInvite {
	token: string;
	path: string;
	expiresAt: string;
}

// ─── Header right slot (total + invite) ──────────────────────────────────────

const HeaderActions = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
`;
const TotalChip = styled.span`
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 8px 14px;
    border-radius: var(--r-pill);
    background: var(--gold-wash);
    border: 1px solid var(--gold-wash-2);
    color: var(--gold-bright);
    font-family: var(--display);
`;
const TotalNumber = styled.span`
    font-size: 18px;
    line-height: 1;
`;
const TotalLabel = styled.span`
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--gold);
`;

// ─── Stats strip ─────────────────────────────────────────────────────────────

const StatsRow = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 24px;
    @media (max-width: 720px) { grid-template-columns: repeat(2, 1fr); }
`;
const StatCard = styled(Card)<{ $accent?: string }>`
    padding: 18px;
    position: relative;
    overflow: hidden;
    &::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: ${(p) => p.$accent ?? "var(--gold)"};
        opacity: 0.6;
    }
`;
const StatHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
`;
const StatLabel = styled.div`
    color: var(--ink-muted);
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
`;
const StatIcon = styled.span<{ $tone: "gold" | "good" | "danger" | "info" }>`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    ${(p) => {
		switch (p.$tone) {
			case "gold":
				return `background: var(--gold-wash); color: var(--gold-bright);`;
			case "good":
				return `background: var(--good-wash); color: var(--good);`;
			case "danger":
				return `background: var(--danger-wash); color: var(--danger);`;
			default:
				return `background: var(--info-wash); color: var(--info);`;
		}
	}}
`;
const StatValue = styled.div`
    font-family: var(--display);
    font-size: 30px;
    line-height: 1;
`;
const StatSub = styled.span`
    font-size: 13px;
    color: var(--ink-muted);
    margin-left: 6px;
`;

// ─── Filter / search bar ─────────────────────────────────────────────────────

const FilterBar = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
    flex-wrap: wrap;
`;
const SearchBox = styled.div`
    position: relative;
    flex: 1;
    min-width: 240px;
    max-width: 420px;
    input {
        width: 100%;
        padding: 11px 16px 11px 40px;
        background: var(--surface-2);
        border: 1px solid var(--hairline);
        border-radius: var(--r-pill);
        color: var(--ink);
        font-size: 13px;
    }
    input:focus { outline: none; border-color: var(--gold); }
    svg {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--ink-muted);
    }
`;
const FilterChips = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
`;
const FilterChip = styled.button<{ $on: boolean }>`
    font-family: inherit;
    cursor: pointer;
    padding: 7px 14px;
    border-radius: var(--r-pill);
    font-size: 12px;
    letter-spacing: 0.04em;
    background: ${(p) => (p.$on ? "var(--gold-wash)" : "transparent")};
    border: 1px solid
        ${(p) => (p.$on ? "var(--gold-wash-2)" : "var(--hairline)")};
    color: ${(p) => (p.$on ? "var(--gold-bright)" : "var(--ink-soft)")};
    transition: all 0.12s ease;
    &:hover {
        border-color: var(--gold);
        color: var(--gold-bright);
    }
`;

// ─── Card grid ───────────────────────────────────────────────────────────────

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    @media (max-width: 1080px) { grid-template-columns: repeat(2, 1fr); }
    @media (max-width: 720px) { grid-template-columns: 1fr; }
`;
const ManagerCard = styled.button`
    text-align: left;
    font: inherit;
    cursor: pointer;
    padding: 20px;
    background: linear-gradient(180deg, var(--surface-2), var(--surface-1));
    border: 1px solid var(--hairline);
    border-radius: var(--r-md);
    display: flex;
    flex-direction: column;
    gap: 14px;
    transition: all 0.15s ease;
    width: 100%;
    &:hover {
        border-color: var(--gold);
        transform: translateY(-2px);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25),
            0 0 0 1px var(--gold-wash-2);
    }
`;
const CardHead = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;
const CardNames = styled.div`
    flex: 1;
    min-width: 0;
    overflow: hidden;
`;
const NameLine = styled.div`
    font-family: var(--display);
    font-size: 17px;
    color: var(--ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;
const EmailLine = styled.div`
    color: var(--ink-muted);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 2px;
`;
const PermCount = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--ink-soft);
    font-size: 12px;
    margin-top: 2px;
`;
const Bar = styled.div`
    width: 100%;
    height: 4px;
    background: var(--surface-3);
    border-radius: 999px;
    overflow: hidden;
`;
const BarFill = styled.div<{ $pct: number }>`
    width: ${(p) => p.$pct}%;
    height: 100%;
    background: linear-gradient(90deg, var(--gold-bright), var(--gold));
    transition: width 0.2s ease;
`;
const ChipRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;
const Chip = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    background: var(--gold-wash);
    color: var(--gold-bright);
    border: 1px solid var(--gold-wash-2);
    border-radius: var(--r-pill);
    font-size: 11px;
    letter-spacing: 0.02em;
`;
const MutedChip = styled(Chip)`
    background: transparent;
    color: var(--ink-muted);
    border-color: var(--hairline);
`;

// ─── Pagination ──────────────────────────────────────────────────────────────

const PaginationBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 22px;
    padding-top: 18px;
    border-top: 1px solid var(--hairline);
    flex-wrap: wrap;
`;
const PageInfo = styled.div`
    color: var(--ink-muted);
    font-size: 12px;
`;
const PageControls = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;
const PageBtn = styled.button<{ $current?: boolean; $disabled?: boolean }>`
    font-family: inherit;
    cursor: ${(p) => (p.$disabled ? "not-allowed" : "pointer")};
    opacity: ${(p) => (p.$disabled ? 0.4 : 1)};
    padding: 6px 11px;
    min-width: 34px;
    border-radius: var(--r-sm);
    font-size: 12px;
    background: ${(p) => (p.$current ? "var(--gold-wash)" : "transparent")};
    border: 1px solid
        ${(p) => (p.$current ? "var(--gold-wash-2)" : "var(--hairline)")};
    color: ${(p) => (p.$current ? "var(--gold-bright)" : "var(--ink-soft)")};
    display: inline-flex;
    align-items: center;
    gap: 4px;
    &:hover:not(:disabled) {
        border-color: var(--gold);
        color: var(--gold-bright);
    }
`;

const EmptyState = styled(Card)`
    padding: 64px 24px;
    text-align: center;
    color: var(--ink-muted);
`;
const EmptyTitle = styled.div`
    font-family: var(--display);
    font-size: 22px;
    color: var(--ink);
    margin: 12px 0 6px;
`;

// ─── Modal ───────────────────────────────────────────────────────────────────

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(10, 9, 7, 0.65);
    backdrop-filter: blur(6px);
    z-index: 50;
    display: grid;
    place-items: center;
    padding: 24px;
    animation: fade 0.18s ease both;
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
`;
const ModalShell = styled(Card)<{ $wide?: boolean }>`
    width: 100%;
    max-width: ${(p) => (p.$wide ? "720px" : "480px")};
    max-height: calc(100vh - 48px);
    overflow-y: auto;
    padding: 0;
    background: var(--surface-1);
    border: 1px solid var(--hairline-strong);
    animation: pop 0.18s ease both;
    @keyframes pop {
        from { transform: scale(0.96); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }
`;
const ModalHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 20px 24px;
    border-bottom: 1px solid var(--hairline);
`;
const ModalTitle = styled.h2`
    font-family: var(--display);
    font-size: 22px;
    margin: 0;
`;
const CloseButton = styled.button`
    background: transparent;
    border: 1px solid transparent;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    color: var(--ink-muted);
    cursor: pointer;
    &:hover {
        color: var(--ink);
        background: var(--surface-2);
        border-color: var(--hairline);
    }
`;
const ModalBody = styled.div`padding: 20px 24px;`;
const ModalFooter = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 16px 24px;
    border-top: 1px solid var(--hairline);
    flex-wrap: wrap;
`;
const ModalFooterRight = styled.div`
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
`;
const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 14px;
`;
const FieldLabel = styled.label`
    font-size: 12px;
    color: var(--ink-muted);
`;
const Input = styled.input`
    padding: 10px 14px;
    background: var(--surface-2);
    border: 1px solid var(--hairline);
    border-radius: var(--r-sm);
    color: var(--ink);
    font-size: 13px;
    &:focus { outline: none; border-color: var(--gold); }
`;
const PermGroup = styled.div`
    & + & {
        margin-top: 18px;
        padding-top: 18px;
        border-top: 1px solid var(--hairline);
    }
`;
const PermGroupHead = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;
`;
const PermGroupTitle = styled.div`
    font-family: var(--display);
    font-size: 14px;
    color: var(--ink);
`;
const PermGroupHint = styled.div`
    color: var(--ink-muted);
    font-size: 11px;
`;
const PermissionRow = styled.label`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    background: var(--surface-2);
    border: 1px solid var(--hairline);
    border-radius: var(--r-sm);
    cursor: pointer;
    font-size: 13px;
    & + & { margin-top: 6px; }
    &:hover { border-color: var(--gold); }
`;
const Toggle = styled.input.attrs({ type: "checkbox" })`
    accent-color: var(--gold-bright);
    width: 16px;
    height: 16px;
`;
const ErrorBox = styled.div`
    margin-top: 12px;
    padding: 10px 14px;
    background: var(--danger-wash);
    border: 1px solid var(--danger-deep);
    border-radius: var(--r-sm);
    color: var(--danger);
    font-size: 13px;
`;
const DirtyStatus = styled.div`
    color: var(--ink-muted);
    font-size: 12px;
`;

// ─── State helpers ───────────────────────────────────────────────────────────

interface IInviteForm {
	fullName: string;
	username: string;
	email: string;
	phone: string;
}
const EMPTY_INVITE: IInviteForm = {
	fullName: "",
	username: "",
	email: "",
	phone: "",
};

function statusTone(
	s: IManager["status"],
): "good" | "danger" | "ghost" | "caution" {
	if (s === "active" || s === "approved") return "good";
	if (s === "suspended") return "danger";
	if (s === "pending") return "caution";
	return "ghost";
}

function matchesStatusFilter(s: IManager["status"], f: StatusFilter): boolean {
	if (f === "all") return true;
	if (f === "active") return s === "active" || s === "approved";
	return s === f;
}

// ─── Top-level component ─────────────────────────────────────────────────────

export default function ManagersWrapper() {
	const { data, mutate, isLoading } = useSWR<
		IResponseEnvelope<{ managers: IManager[] }>
	>("/api/admin/managers", fetcher, { revalidateOnMount: true });
	const managers = data?.data?.managers ?? [];

	const [query, setQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [page, setPage] = useState(1);

	// Reset to first page whenever the filter/search shrinks the result set,
	// otherwise the user can land on an empty page after typing.
	//
	// We use React's recommended "reset state on prop change" pattern
	// (https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes)
	// rather than a useEffect — biome's `useExhaustiveDependencies` rule kept
	// stripping `[query, statusFilter]` to `[]` because the effect body
	// doesn't read them, which broke the reset AND triggered React's runtime
	// "deps array changed size between renders" warning under HMR.
	const filterKey = `${query}::${statusFilter}`;
	const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
	if (prevFilterKey !== filterKey) {
		setPrevFilterKey(filterKey);
		setPage(1);
	}

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return managers.filter((m) => {
			if (!matchesStatusFilter(m.status, statusFilter)) return false;
			if (!q) return true;
			return (
				m.fullName.toLowerCase().includes(q) ||
				m.email.toLowerCase().includes(q) ||
				m.username.toLowerCase().includes(q)
			);
		});
	}, [managers, query, statusFilter]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);
	const pageStart = (safePage - 1) * PAGE_SIZE;
	const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

	const stats = useMemo(() => {
		const total = managers.length;
		const active = managers.filter(
			(m) => m.status === "active" || m.status === "approved",
		).length;
		const suspended = managers.filter(
			(m) => m.status === "suspended",
		).length;
		const avg =
			total === 0
				? 0
				: Math.round(
						managers.reduce((s, m) => s + m.permissions.length, 0) /
							total,
					);
		return { total, active, suspended, avg };
	}, [managers]);

	const statusCounts = useMemo(() => {
		const counts: Record<StatusFilter, number> = {
			all: managers.length,
			active: 0,
			suspended: 0,
			pending: 0,
			rejected: 0,
		};
		for (const m of managers) {
			if (m.status === "active" || m.status === "approved")
				counts.active++;
			else if (m.status === "suspended") counts.suspended++;
			else if (m.status === "pending") counts.pending++;
			else if (m.status === "rejected") counts.rejected++;
		}
		return counts;
	}, [managers]);

	const [showInvite, setShowInvite] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const selected = useMemo(
		() => managers.find((m) => m.id === selectedId) ?? null,
		[managers, selectedId],
	);

	return (
		<PageShell
			eyebrow="Admin · Delegation"
			title="Manager"
			titleEm="accounts"
			navTitle="Managers"
			subtitle="Invite teammates and grant them ONLY the slices of admin they need. New managers default to zero access."
			right={
				<HeaderActions>
					<TotalChip>
						<TotalNumber>{managers.length}</TotalNumber>
						<TotalLabel>total</TotalLabel>
					</TotalChip>
					<Button
						variant="primary"
						size="md"
						icon="plus"
						onClick={() => setShowInvite(true)}
						data-testid="manager-invite"
					>
						Invite manager
					</Button>
				</HeaderActions>
			}
		>
			<div data-testid="managers-page">
				<StatsRow data-testid="managers-stats">
					<StatCard $accent="var(--gold)">
						<StatHead>
							<StatLabel>Total managers</StatLabel>
							<StatIcon $tone="gold">
								<Icon name="users" size={14} />
							</StatIcon>
						</StatHead>
						<StatValue>{stats.total}</StatValue>
					</StatCard>
					<StatCard $accent="var(--good)">
						<StatHead>
							<StatLabel>Active</StatLabel>
							<StatIcon $tone="good">
								<Icon name="check" size={14} />
							</StatIcon>
						</StatHead>
						<StatValue>{stats.active}</StatValue>
					</StatCard>
					<StatCard $accent="var(--danger)">
						<StatHead>
							<StatLabel>Suspended</StatLabel>
							<StatIcon $tone="danger">
								<Icon name="x" size={14} />
							</StatIcon>
						</StatHead>
						<StatValue>{stats.suspended}</StatValue>
					</StatCard>
					<StatCard $accent="var(--info)">
						<StatHead>
							<StatLabel>Avg permissions</StatLabel>
							<StatIcon $tone="info">
								<Icon name="shield-check" size={14} />
							</StatIcon>
						</StatHead>
						<StatValue>
							{stats.avg}
							<StatSub>/ {ALL_PERMISSION_KEYS.length}</StatSub>
						</StatValue>
					</StatCard>
				</StatsRow>

				<FilterBar>
					<SearchBox>
						<Icon name="search" size={14} />
						<input
							placeholder="Search by name, email, or username…"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							data-testid="managers-search"
						/>
					</SearchBox>
					<FilterChips data-testid="managers-filter">
						{STATUS_FILTERS.map((f) => (
							<FilterChip
								key={f.value}
								type="button"
								$on={statusFilter === f.value}
								onClick={() => setStatusFilter(f.value)}
								data-testid={`managers-filter-${f.value}`}
							>
								{f.label}
								<span
									style={{
										marginLeft: 6,
										color: "var(--ink-faint)",
									}}
								>
									{statusCounts[f.value]}
								</span>
							</FilterChip>
						))}
					</FilterChips>
				</FilterBar>

				{isLoading && (
					<EmptyState>
						<EmptyTitle>Loading…</EmptyTitle>
					</EmptyState>
				)}

				{!isLoading && managers.length === 0 && (
					<EmptyState data-testid="managers-empty">
						<Icon name="users" size={32} />
						<EmptyTitle>No managers yet</EmptyTitle>
						<div>
							Invite teammates to delegate slices of the admin
							dashboard. New managers start with zero access.
						</div>
						<div style={{ marginTop: 18 }}>
							<Button
								variant="primary"
								size="md"
								icon="plus"
								onClick={() => setShowInvite(true)}
							>
								Invite your first manager
							</Button>
						</div>
					</EmptyState>
				)}

				{!isLoading && managers.length > 0 && (
					<>
						<Grid data-testid="managers-list">
							{pageItems.map((m) => (
								<ManagerRoleCard
									key={m.id}
									manager={m}
									onClick={() => setSelectedId(m.id)}
								/>
							))}
						</Grid>

						{filtered.length === 0 && (
							<EmptyState data-testid="managers-no-match">
								<EmptyTitle>No matches</EmptyTitle>
								<div>
									Nothing matches your search or filter. Try
									clearing them.
								</div>
								<div style={{ marginTop: 18 }}>
									<Button
										variant="secondary"
										size="sm"
										onClick={() => {
											setQuery("");
											setStatusFilter("all");
										}}
									>
										Clear filters
									</Button>
								</div>
							</EmptyState>
						)}

						{filtered.length > 0 && (
							<Pagination
								page={safePage}
								totalPages={totalPages}
								totalItems={filtered.length}
								pageSize={PAGE_SIZE}
								onPage={setPage}
							/>
						)}
					</>
				)}
			</div>

			{showInvite && (
				<InviteModal
					onClose={() => setShowInvite(false)}
					onCreated={(id) => {
						setShowInvite(false);
						mutate();
						setSelectedId(id);
					}}
				/>
			)}

			{selected && (
				<DetailModal
					manager={selected}
					onClose={() => setSelectedId(null)}
					onChanged={() => mutate()}
				/>
			)}
		</PageShell>
	);
}

// ─── Pagination ──────────────────────────────────────────────────────────────

function Pagination({
	page,
	totalPages,
	totalItems,
	pageSize,
	onPage,
}: {
	page: number;
	totalPages: number;
	totalItems: number;
	pageSize: number;
	onPage: (n: number) => void;
}) {
	const start = (page - 1) * pageSize + 1;
	const end = Math.min(page * pageSize, totalItems);

	// Compact page-number window so the bar doesn't grow unbounded for many
	// pages: always show first, last, current, and one neighbour either side.
	const visiblePages = useMemo(() => {
		const out = new Set<number>([1, totalPages, page, page - 1, page + 1]);
		return Array.from(out)
			.filter((n) => n >= 1 && n <= totalPages)
			.sort((a, b) => a - b);
	}, [page, totalPages]);

	return (
		<PaginationBar data-testid="managers-pagination">
			<PageInfo>
				Showing{" "}
				<strong style={{ color: "var(--ink)" }}>
					{start}–{end}
				</strong>{" "}
				of <strong style={{ color: "var(--ink)" }}>{totalItems}</strong>{" "}
				· Page {page} of {totalPages}
			</PageInfo>
			<PageControls>
				<PageBtn
					type="button"
					$disabled={page === 1}
					disabled={page === 1}
					onClick={() => onPage(page - 1)}
					data-testid="managers-page-prev"
				>
					<Icon name="chevron-left" size={12} /> Prev
				</PageBtn>
				{visiblePages.map((n, i) => {
					const prev = visiblePages[i - 1];
					const gap = prev !== undefined && n - prev > 1;
					return (
						<span
							key={n}
							style={{ display: "inline-flex", gap: 6 }}
						>
							{gap && (
								<span
									style={{
										color: "var(--ink-faint)",
										padding: "0 4px",
										fontSize: 12,
									}}
								>
									…
								</span>
							)}
							<PageBtn
								type="button"
								$current={n === page}
								onClick={() => onPage(n)}
								data-testid={`managers-page-${n}`}
							>
								{n}
							</PageBtn>
						</span>
					);
				})}
				<PageBtn
					type="button"
					$disabled={page === totalPages}
					disabled={page === totalPages}
					onClick={() => onPage(page + 1)}
					data-testid="managers-page-next"
				>
					Next <Icon name="chevron-right" size={12} />
				</PageBtn>
			</PageControls>
		</PaginationBar>
	);
}

// ─── Manager card ────────────────────────────────────────────────────────────

function ManagerRoleCard({
	manager,
	onClick,
}: {
	manager: IManager;
	onClick: () => void;
}) {
	const total = ALL_PERMISSION_KEYS.length;
	const have = manager.permissions.length;
	const pct = total === 0 ? 0 : Math.round((have / total) * 100);
	const top = manager.permissions.slice(0, 3);
	const overflow = Math.max(0, manager.permissions.length - top.length);
	return (
		<ManagerCard
			type="button"
			onClick={onClick}
			data-testid={`manager-row-${manager.email}`}
		>
			<CardHead>
				<Avatar name={manager.fullName} size={44} />
				<CardNames>
					<NameLine>{manager.fullName}</NameLine>
					<EmailLine>{manager.email}</EmailLine>
				</CardNames>
				<Pill tone={statusTone(manager.status)}>{manager.status}</Pill>
			</CardHead>

			<div>
				<PermCount>
					<span>
						{have === 0
							? "No permissions yet"
							: `${have} / ${total} permission${have === 1 ? "" : "s"}`}
					</span>
					<span style={{ color: "var(--ink-muted)" }}>{pct}%</span>
				</PermCount>
				<Bar style={{ marginTop: 8 }}>
					<BarFill $pct={pct} />
				</Bar>
			</div>

			<ChipRow>
				{top.length === 0 && (
					<MutedChip>Zero access — click to grant</MutedChip>
				)}
				{top.map((p) => (
					<Chip key={p}>{PERMISSION_LABEL_BY_KEY[p] ?? p}</Chip>
				))}
				{overflow > 0 && <MutedChip>+{overflow} more</MutedChip>}
			</ChipRow>
		</ManagerCard>
	);
}

// ─── Invite modal ────────────────────────────────────────────────────────────

function InviteModal({
	onClose,
	onCreated,
}: {
	onClose: () => void;
	onCreated: (id: string) => void;
}) {
	const [form, setForm] = useState<IInviteForm>(EMPTY_INVITE);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// Two-stage modal: form → issued-invite confirmation. Once the invite is
	// minted we surface the one-shot URL the admin can copy/paste so they can
	// hand it to the manager out-of-band (until the email path is wired up).
	const [issued, setIssued] = useState<{
		manager: IManager;
		invite: IIssuedInvite;
	} | null>(null);
	const [copied, setCopied] = useState(false);

	useEscapeKey(onClose);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		if (submitting) return;
		setSubmitting(true);
		setError(null);
		try {
			const res = await api().post("/api/admin/managers", {
				fullName: form.fullName,
				username: form.username,
				email: form.email,
				phone: form.phone || undefined,
				// Default: zero permissions. The admin grants them via the
				// detail modal AFTER the manager accepts the invite — the
				// server refuses grants on pending rows.
				permissions: [],
			});
			const data = res.data?.data;
			const manager: IManager | undefined = data?.manager;
			const invite: IIssuedInvite | undefined = data?.invite;
			if (manager && invite) {
				setIssued({ manager, invite });
			} else {
				onClose();
			}
		} catch (err) {
			setError(getErrorMessage(err, "Could not create manager"));
		} finally {
			setSubmitting(false);
		}
	}

	async function copyLink() {
		if (!issued) return;
		const fullUrl = new URL(
			issued.invite.path,
			window.location.origin,
		).toString();
		try {
			await navigator.clipboard.writeText(fullUrl);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			// Clipboard may be unavailable (insecure context, denied perms);
			// the input is still selectable so the admin can copy manually.
		}
	}

	return (
		<Backdrop
			role="dialog"
			aria-modal="true"
			aria-labelledby="invite-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			data-testid="invite-modal"
		>
			<ModalShell>
				{!issued && (
					<form onSubmit={submit}>
						<ModalHead>
							<div>
								<Eyebrow $gold style={{ marginBottom: 4 }}>
									Invite
								</Eyebrow>
								<ModalTitle id="invite-modal-title">
									Add a manager
								</ModalTitle>
							</div>
							<CloseButton
								type="button"
								onClick={onClose}
								aria-label="Close"
							>
								<Icon name="x" size={16} />
							</CloseButton>
						</ModalHead>
						<ModalBody>
							<Field>
								<FieldLabel htmlFor="m-fullname">
									Full name
								</FieldLabel>
								<Input
									id="m-fullname"
									required
									value={form.fullName}
									data-testid="invite-fullname"
									onChange={(e) =>
										setForm((s) => ({
											...s,
											fullName: e.target.value,
										}))
									}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="m-username">
									Username
								</FieldLabel>
								<Input
									id="m-username"
									required
									value={form.username}
									data-testid="invite-username"
									onChange={(e) =>
										setForm((s) => ({
											...s,
											username: e.target.value,
										}))
									}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="m-email">Email</FieldLabel>
								<Input
									id="m-email"
									type="email"
									required
									value={form.email}
									data-testid="invite-email"
									onChange={(e) =>
										setForm((s) => ({
											...s,
											email: e.target.value,
										}))
									}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="m-phone">
									Phone (optional)
								</FieldLabel>
								<Input
									id="m-phone"
									value={form.phone}
									data-testid="invite-phone"
									onChange={(e) =>
										setForm((s) => ({
											...s,
											phone: e.target.value,
										}))
									}
								/>
							</Field>
							{error && <ErrorBox>{error}</ErrorBox>}
						</ModalBody>
						<ModalFooter>
							<DirtyStatus>
								The manager will be sent an invite link and
								stays pending until they accept.
							</DirtyStatus>
							<ModalFooterRight>
								<Button
									type="button"
									variant="ghost"
									size="md"
									onClick={onClose}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									variant="primary"
									size="md"
									disabled={submitting}
									data-testid="invite-submit"
								>
									{submitting ? "Sending…" : "Send invite"}
								</Button>
							</ModalFooterRight>
						</ModalFooter>
					</form>
				)}

				{issued && (
					<div data-testid="invite-issued">
						<ModalHead>
							<div>
								<Eyebrow $gold style={{ marginBottom: 4 }}>
									Invite sent
								</Eyebrow>
								<ModalTitle id="invite-modal-title">
									Share this one-time link
								</ModalTitle>
							</div>
							<CloseButton
								type="button"
								onClick={() => {
									const id = issued.manager.id;
									setIssued(null);
									setForm(EMPTY_INVITE);
									onCreated(id);
								}}
								aria-label="Close"
							>
								<Icon name="x" size={16} />
							</CloseButton>
						</ModalHead>
						<ModalBody>
							<DirtyStatus style={{ marginBottom: 12 }}>
								We notified{" "}
								<strong>{issued.manager.email}</strong>. If they
								don't get the email, share this link — it works
								once.
							</DirtyStatus>
							<Input
								readOnly
								onFocus={(e) => e.currentTarget.select()}
								value={
									typeof window === "undefined"
										? issued.invite.path
										: new URL(
												issued.invite.path,
												window.location.origin,
											).toString()
								}
								data-testid="invite-issued-url"
								style={{ width: "100%" }}
							/>
							<DirtyStatus style={{ marginTop: 10 }}>
								Expires{" "}
								<strong>
									{new Date(
										issued.invite.expiresAt,
									).toLocaleString()}
								</strong>
								. The manager has zero permissions until they
								accept.
							</DirtyStatus>
						</ModalBody>
						<ModalFooter>
							<DirtyStatus>
								{copied
									? "Copied!"
									: "Copy and send to the manager."}
							</DirtyStatus>
							<ModalFooterRight>
								<Button
									type="button"
									variant="secondary"
									size="md"
									icon="paperclip"
									onClick={copyLink}
									data-testid="invite-copy"
								>
									{copied ? "Copied" : "Copy link"}
								</Button>
								<Button
									type="button"
									variant="primary"
									size="md"
									onClick={() => {
										const id = issued.manager.id;
										setIssued(null);
										setForm(EMPTY_INVITE);
										onCreated(id);
									}}
									data-testid="invite-done"
								>
									Done
								</Button>
							</ModalFooterRight>
						</ModalFooter>
					</div>
				)}
			</ModalShell>
		</Backdrop>
	);
}

// ─── Detail modal ────────────────────────────────────────────────────────────

function DetailModal({
	manager,
	onClose,
	onChanged,
}: {
	manager: IManager;
	onClose: () => void;
	onChanged: () => void;
}) {
	const [draft, setDraft] = useState<string[]>(manager.permissions);
	const [savingPerms, setSavingPerms] = useState(false);
	const [statusBusy, setStatusBusy] = useState(false);
	const [resending, setResending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// Surfaced when the admin resends an invite — we show the new URL once,
	// the same way the create-flow does.
	const [reissued, setReissued] = useState<IIssuedInvite | null>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		setDraft(manager.permissions);
	}, [manager.permissions]);

	useEscapeKey(onClose);

	const dirty = useMemo(() => {
		const a = new Set(manager.permissions);
		const b = new Set(draft);
		if (a.size !== b.size) return true;
		for (const v of a) if (!b.has(v)) return true;
		return false;
	}, [manager.permissions, draft]);

	const isPending = manager.status === "pending";
	const isRejected = manager.status === "rejected";
	const permissionsLocked = isPending || isRejected;
	const canResend = isPending || isRejected;

	function toggle(key: string, on: boolean) {
		if (permissionsLocked) return;
		setDraft((current) => {
			const next = new Set(current);
			if (on) next.add(key);
			else next.delete(key);
			return Array.from(next);
		});
	}

	async function save() {
		if (permissionsLocked) return;
		setSavingPerms(true);
		setError(null);
		try {
			await api().patch(`/api/admin/managers/${manager.id}`, {
				permissions: draft,
			});
			onChanged();
		} catch (err) {
			setError(getErrorMessage(err, "Could not save permissions"));
		} finally {
			setSavingPerms(false);
		}
	}

	async function toggleStatus() {
		setStatusBusy(true);
		setError(null);
		try {
			const action =
				manager.status === "suspended" ? "reactivate" : "suspend";
			await api().patch(`/api/admin/managers/${manager.id}`, { action });
			onChanged();
		} catch (err) {
			setError(getErrorMessage(err, "Could not update status"));
		} finally {
			setStatusBusy(false);
		}
	}

	async function resendInvite() {
		setResending(true);
		setError(null);
		try {
			const res = await api().post(
				`/api/admin/managers/${manager.id}/resend-invite`,
			);
			const invite: IIssuedInvite | undefined = res.data?.data?.invite;
			if (invite) setReissued(invite);
			onChanged();
		} catch (err) {
			setError(getErrorMessage(err, "Could not resend invite"));
		} finally {
			setResending(false);
		}
	}

	async function copyLink() {
		if (!reissued) return;
		const fullUrl = new URL(
			reissued.path,
			window.location.origin,
		).toString();
		try {
			await navigator.clipboard.writeText(fullUrl);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			// ignore — input remains selectable for manual copy
		}
	}

	return (
		<Backdrop
			role="dialog"
			aria-modal="true"
			aria-labelledby="detail-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			data-testid="manager-detail"
		>
			<ModalShell $wide>
				<ModalHead>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 14,
						}}
					>
						<Avatar name={manager.fullName} size={48} />
						<div>
							<Eyebrow $gold style={{ marginBottom: 4 }}>
								Permissions
							</Eyebrow>
							<ModalTitle id="detail-modal-title">
								{manager.fullName}
							</ModalTitle>
							<div
								style={{
									color: "var(--ink-muted)",
									fontSize: 12,
									marginTop: 4,
								}}
							>
								{manager.email}
							</div>
						</div>
					</div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 10,
						}}
					>
						<Pill tone={statusTone(manager.status)}>
							{manager.status}
						</Pill>
						<CloseButton
							type="button"
							onClick={onClose}
							aria-label="Close"
						>
							<Icon name="x" size={16} />
						</CloseButton>
					</div>
				</ModalHead>

				<ModalBody data-testid="permission-toggles">
					{permissionsLocked && (
						<div
							data-testid="manager-pending-banner"
							style={{
								marginBottom: 18,
								padding: "12px 14px",
								background: "var(--caution-wash)",
								border: "1px solid var(--caution-deep)",
								borderRadius: "var(--r-sm)",
								color: "var(--caution)",
								fontSize: 13,
							}}
						>
							<strong>
								{isPending
									? "Invite pending."
									: "Invite declined."}
							</strong>{" "}
							{isPending
								? "Permissions are locked until the manager accepts the invite — that's intentional, so a manager can't be granted access before they confirm the account."
								: "This manager declined the invite. Resend a fresh one to reopen access."}
						</div>
					)}
					{reissued && (
						<div
							data-testid="manager-reissued"
							style={{
								marginBottom: 18,
								padding: 12,
								background: "var(--surface-2)",
								border: "1px solid var(--hairline)",
								borderRadius: "var(--r-sm)",
							}}
						>
							<DirtyStatus style={{ marginBottom: 8 }}>
								New invite link (expires{" "}
								{new Date(reissued.expiresAt).toLocaleString()}
								):
							</DirtyStatus>
							<Input
								readOnly
								onFocus={(e) => e.currentTarget.select()}
								value={
									typeof window === "undefined"
										? reissued.path
										: new URL(
												reissued.path,
												window.location.origin,
											).toString()
								}
								data-testid="manager-reissued-url"
								style={{ width: "100%" }}
							/>
							<div
								style={{
									display: "flex",
									justifyContent: "flex-end",
									marginTop: 8,
								}}
							>
								<Button
									type="button"
									variant="secondary"
									size="sm"
									icon="paperclip"
									onClick={copyLink}
									data-testid="manager-reissued-copy"
								>
									{copied ? "Copied" : "Copy link"}
								</Button>
							</div>
						</div>
					)}
					{PERMISSION_GROUPS.map((g) => (
						<PermGroup key={g.label}>
							<PermGroupHead>
								<PermGroupTitle>{g.label}</PermGroupTitle>
								<PermGroupHint>{g.hint}</PermGroupHint>
							</PermGroupHead>
							{g.items.map((p) => {
								const on = draft.includes(p.key);
								return (
									<PermissionRow
										key={p.key}
										data-testid={`perm-${p.key}`}
										style={
											permissionsLocked
												? {
														opacity: 0.55,
														cursor: "not-allowed",
													}
												: undefined
										}
									>
										<span>{p.label}</span>
										<Toggle
											checked={on}
											disabled={permissionsLocked}
											data-testid={`perm-toggle-${p.key}`}
											onChange={(e) =>
												toggle(p.key, e.target.checked)
											}
										/>
									</PermissionRow>
								);
							})}
						</PermGroup>
					))}
					{error && <ErrorBox>{error}</ErrorBox>}
				</ModalBody>

				<ModalFooter>
					<DirtyStatus>
						{permissionsLocked
							? "Permission grants are locked until the manager accepts."
							: dirty
								? "Unsaved changes — click Save to apply."
								: "Up to date."}
					</DirtyStatus>
					<ModalFooterRight>
						{canResend && (
							<Button
								type="button"
								variant="secondary"
								size="md"
								icon="send"
								disabled={resending}
								onClick={resendInvite}
								data-testid="resend-invite"
							>
								{resending ? "Resending…" : "Resend invite"}
							</Button>
						)}
						{!canResend && (
							<Button
								type="button"
								variant="secondary"
								size="md"
								disabled={statusBusy}
								onClick={toggleStatus}
								data-testid="toggle-status"
							>
								{manager.status === "suspended"
									? "Reactivate"
									: "Suspend"}
							</Button>
						)}
						{dirty && !permissionsLocked && (
							<Button
								type="button"
								variant="ghost"
								size="md"
								onClick={() => setDraft(manager.permissions)}
							>
								Discard
							</Button>
						)}
						<Button
							type="button"
							variant="primary"
							size="md"
							disabled={
								permissionsLocked || !dirty || savingPerms
							}
							onClick={save}
							data-testid="save-permissions"
						>
							{savingPerms ? "Saving…" : "Save permissions"}
						</Button>
					</ModalFooterRight>
				</ModalFooter>
			</ModalShell>
		</Backdrop>
	);
}

// ─── Misc helpers ────────────────────────────────────────────────────────────

function useEscapeKey(handler: () => void) {
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") handler();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [handler]);
}
