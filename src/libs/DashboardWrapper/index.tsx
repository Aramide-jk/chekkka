"use client";

import Link from "next/link";
import styled from "styled-components";
import useSWR from "swr";
import { Button, Card, Icon, Pill } from "@/components";
import { fetcher } from "@/constants";
import { PageShell } from "@/layouts";
import type { IResponseEnvelope } from "@/types";

interface IInspection {
	_id: string;
	status: string;
	car: { make: string; model: string; year: number };
	photoCount?: number;
	scheduledFor?: string;
	slot?: string;
	report?: { verdict?: "good" | "caution" | "danger" };
	createdAt?: string;
}

interface IBuyerDashboard {
	stats: {
		active: number;
		completed: number;
		worthBuying: number;
		avoided: number;
	};
	active: IInspection[];
	recent: IInspection[];
}

const Grid = styled.div`
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 24px;

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
    }
`;

const StatsRow = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;

    @media (max-width: 720px) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const Stat = styled(Card)`padding: 22px;`;
const StatLabel = styled.div`
    color: var(--ink-muted);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    margin-bottom: 14px;
`;
const StatValue = styled.div`
    font-family: var(--display);
    font-size: 36px;
    line-height: 1;
`;
const Section = styled(Card)`padding: 24px;`;
const SectionHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
`;
const SectionTitle = styled.h2`
    font-family: var(--display);
    font-size: 24px;
    margin: 0;
`;
const Row = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0;
    gap: 12px;
    border-bottom: 1px solid var(--hairline);
    &:last-child { border-bottom: none; }
`;
const RowMain = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
`;
const Thumb = styled.div`
    width: 44px;
    height: 44px;
    border-radius: var(--r-sm);
    background: var(--surface-2);
    color: var(--gold);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;
const RowText = styled.div`min-width: 0;`;
const RowTitle = styled.div`
    font-size: 14px;
    color: var(--ink);
    margin-bottom: 4px;
`;
const RowMeta = styled.div`
    font-size: 12px;
    color: var(--ink-muted);
`;
const Side = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;
`;
const Empty = styled.div`
    color: var(--ink-muted);
    font-size: 13px;
    padding: 18px 0;
    text-align: center;
`;

const STATUS_LABEL: Record<
	string,
	{ label: string; tone: "gold" | "info" | "ghost" }
> = {
	submitted: { label: "Awaiting assignment", tone: "ghost" },
	assigned: { label: "Inspector assigned", tone: "info" },
	scheduled: { label: "Scheduled", tone: "info" },
	in_progress: { label: "Live now", tone: "gold" },
	report_processing: { label: "Report processing", tone: "ghost" },
	declined: { label: "Declined", tone: "ghost" },
	completed: { label: "Completed", tone: "info" },
};

const VERDICT_LABEL: Record<
	string,
	{ label: string; tone: "good" | "caution" | "danger" }
> = {
	good: { label: "Worth Buying", tone: "good" },
	caution: { label: "Buy With Caution", tone: "caution" },
	danger: { label: "Not Recommended", tone: "danger" },
};

function carLabel(c: IInspection["car"]) {
	return `${c.make} ${c.model} ${c.year}`;
}

function formatWhen(s?: string) {
	if (!s) return "";
	const d = new Date(s);
	const diff = Date.now() - d.getTime();
	const days = Math.floor(diff / (24 * 60 * 60 * 1000));
	if (days < 1) return "Today";
	if (days < 2) return "Yesterday";
	if (days < 7) return `${days} days ago`;
	return d.toLocaleDateString();
}

export default function DashboardWrapper() {
	const { data, error, isLoading } = useSWR<
		IResponseEnvelope<IBuyerDashboard>
	>("/api/dashboard/buyer", fetcher, { revalidateOnMount: true });

	const stats = data?.data?.stats ?? {
		active: 0,
		completed: 0,
		worthBuying: 0,
		avoided: 0,
	};
	const active = data?.data?.active ?? [];
	const recent = data?.data?.recent ?? [];
	const unauthenticated =
		!!error &&
		(error as { response?: { status?: number } }).response?.status === 401;

	return (
		<PageShell
			eyebrow="Your dashboard"
			title="Welcome back,"
			titleEm="Buyer"
			navTitle="Dashboard"
			subtitle="Track every inspection in flight, read your reports, and pick up where you left off."
			right={
				<Link href="/book">
					<Button variant="primary" size="md" icon="plus">
						Book inspection
					</Button>
				</Link>
			}
		>
			<StatsRow data-testid="dashboard-stats">
				<Stat>
					<StatLabel>Active</StatLabel>
					<StatValue>{stats.active}</StatValue>
				</Stat>
				<Stat>
					<StatLabel>Completed</StatLabel>
					<StatValue>{stats.completed}</StatValue>
				</Stat>
				<Stat>
					<StatLabel>Worth buying</StatLabel>
					<StatValue>{stats.worthBuying}</StatValue>
				</Stat>
				<Stat>
					<StatLabel>Avoided</StatLabel>
					<StatValue>{stats.avoided}</StatValue>
				</Stat>
			</StatsRow>

			<Grid>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 24,
					}}
				>
					<Section>
						<SectionHead>
							<SectionTitle>Active inspections</SectionTitle>
							{active.length > 0 && (
								<Pill tone="gold" dot>
									Live
								</Pill>
							)}
						</SectionHead>
						{isLoading && active.length === 0 && (
							<Empty>Loading…</Empty>
						)}
						{!isLoading && active.length === 0 && (
							<Empty>
								{unauthenticated
									? "Sign in to see your inspections."
									: "No active inspections — book one to get started."}
							</Empty>
						)}
						{active.map((a) => {
							const meta = STATUS_LABEL[a.status] ?? {
								label: a.status,
								tone: "ghost",
							};
							const subtitle =
								a.status === "in_progress"
									? `Inspector working · ${a.photoCount ?? 0} photos`
									: a.status === "scheduled" && a.scheduledFor
										? `Scheduled ${new Date(a.scheduledFor).toLocaleDateString()} · ${a.slot ?? ""}`
										: `Created ${formatWhen(a.createdAt)}`;
							return (
								<Row key={a._id}>
									<RowMain>
										<Thumb>
											<Icon name="car" size={20} />
										</Thumb>
										<RowText>
											<RowTitle>
												{carLabel(a.car)}
											</RowTitle>
											<RowMeta>{subtitle}</RowMeta>
										</RowText>
									</RowMain>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: 12,
										}}
									>
										<Pill
											tone={meta.tone}
											dot={meta.tone === "gold"}
										>
											{meta.label}
										</Pill>
										<Link href={`/inspections/${a._id}`}>
											<Button variant="ghost" size="sm">
												View
											</Button>
										</Link>
									</div>
								</Row>
							);
						})}
					</Section>

					<Section>
						<SectionHead>
							<SectionTitle>Recent reports</SectionTitle>
							<Link href="/inspections">
								<Button variant="ghost" size="sm">
									All reports
								</Button>
							</Link>
						</SectionHead>
						{!isLoading && recent.length === 0 && (
							<Empty>No completed reports yet.</Empty>
						)}
						{recent.map((r) => {
							const v = r.report?.verdict
								? VERDICT_LABEL[r.report.verdict]
								: null;
							return (
								<Row key={r._id}>
									<RowMain>
										<Thumb>
											<Icon
												name="shield-check"
												size={20}
											/>
										</Thumb>
										<RowText>
											<RowTitle>
												{carLabel(r.car)}
											</RowTitle>
											<RowMeta>
												{formatWhen(r.createdAt)}
											</RowMeta>
										</RowText>
									</RowMain>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: 12,
										}}
									>
										{v && (
											<Pill tone={v.tone}>{v.label}</Pill>
										)}
										<Link href={`/inspections/${r._id}`}>
											<Button variant="ghost" size="sm">
												Read
											</Button>
										</Link>
									</div>
								</Row>
							);
						})}
					</Section>
				</div>

				<Side>
					<Section>
						<SectionTitle style={{ marginBottom: 16 }}>
							Quick actions
						</SectionTitle>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 10,
							}}
						>
							<Link href="/book">
								<Button
									variant="secondary"
									size="md"
									fullWidth
									icon="plus"
								>
									Book inspection
								</Button>
							</Link>
							<Link href="/chat">
								<Button
									variant="secondary"
									size="md"
									fullWidth
									icon="chat"
								>
									Chat with consultant
								</Button>
							</Link>
							<Link href="/sample-report">
								<Button
									variant="ghost"
									size="md"
									fullWidth
									icon="eye"
								>
									See a sample report
								</Button>
							</Link>
						</div>
					</Section>

					<Section>
						<SectionTitle style={{ marginBottom: 16 }}>
							Need a broker?
						</SectionTitle>
						<p
							style={{
								color: "var(--ink-soft)",
								fontSize: 13,
								lineHeight: 1.55,
								marginBottom: 16,
							}}
						>
							A Chekka broker negotiates with the seller, handles
							payment securely, and arranges delivery — so you
							don't have to.
						</p>
						<Link href="/chat?context=broker">
							<Button variant="primary" size="md" fullWidth>
								Talk to a broker
							</Button>
						</Link>
					</Section>
				</Side>
			</Grid>
		</PageShell>
	);
}
