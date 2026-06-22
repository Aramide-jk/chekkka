"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styled from "styled-components";
import useSWR, { mutate } from "swr";
import { Button, Card, Eyebrow, Icon, Pill } from "@/components";
import { api, fetcher } from "@/constants";
import { PageShell } from "@/layouts";
import type { IResponseEnvelope } from "@/types";

interface IJob {
	_id: string;
	status: string;
	car: { make: string; model: string; year: number };
	scheduledFor?: string;
	slot?: string;
	price: number;
	currentSection?: string;
}

interface IDashboard {
	stats: { pending: number; active: number; completed: number };
	jobs: IJob[];
	earnings: { released: number; held: number; totalCount: number };
	profile: { availability: { toggleOn: boolean }; rating: number } | null;
	payoutPercent: number;
}

const StatsRow = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;
    @media (max-width: 720px) { grid-template-columns: repeat(2, 1fr); }
`;
const Stat = styled(Card)`padding: 22px;`;
const StatLabel = styled.div`
    color: var(--ink-muted);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    margin-bottom: 12px;
`;
const StatValue = styled.div`font-family: var(--display); font-size: 32px; line-height: 1;`;
const ToggleCard = styled(Card)`
    padding: 18px 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
`;
const Toggle = styled.button<{ $on: boolean }>`
    width: 56px;
    height: 32px;
    border-radius: 999px;
    background: ${(p) => (p.$on ? "var(--gold)" : "var(--surface-3)")};
    position: relative;
    border: none;
    cursor: pointer;
    transition: background 0.2s ease;
    &::after {
        content: "";
        position: absolute;
        top: 4px;
        left: ${(p) => (p.$on ? "28px" : "4px")};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: ${(p) => (p.$on ? "#1A1813" : "var(--ink-soft)")};
        transition: left 0.2s ease;
    }
`;
const Grid = styled.div`
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 24px;
    @media (max-width: 900px) { grid-template-columns: 1fr; }
`;
const Section = styled(Card)`padding: 24px;`;
const Row = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0;
    gap: 12px;
    border-bottom: 1px solid var(--hairline);
    &:last-child { border-bottom: none; }
`;
const Empty = styled.div`
    color: var(--ink-muted);
    font-size: 13px;
    padding: 18px 0;
    text-align: center;
`;

export default function DashboardWrapper() {
	const { data } = useSWR<IResponseEnvelope<IDashboard>>(
		"/api/dashboard/inspector",
		fetcher,
		{ revalidateOnMount: true },
	);
	const [on, setOn] = useState(true);

	useEffect(() => {
		if (data?.data?.profile) {
			setOn(!!data.data.profile.availability?.toggleOn);
		}
	}, [data]);

	const stats = data?.data?.stats ?? { pending: 0, active: 0, completed: 0 };
	const jobs = data?.data?.jobs ?? [];
	const earnings = data?.data?.earnings ?? {
		released: 0,
		held: 0,
		totalCount: 0,
	};
	const rating = data?.data?.profile?.rating ?? 0;
	const payoutFraction = (data?.data?.payoutPercent ?? 65) / 100;

	async function toggle() {
		const next = !on;
		setOn(next);
		try {
			await api().patch("/api/inspector-profiles/availability", {
				toggleOn: next,
			});
			mutate("/api/dashboard/inspector");
		} catch {
			setOn(!next);
		}
	}

	return (
		<PageShell
			eyebrow="Inspector"
			title="Welcome,"
			titleEm="Inspector"
			navTitle="Inspector"
			subtitle="Your inspection queue, schedule, and earnings — all in one place."
			right={
				<Link href="/inspector/schedule">
					<Button variant="secondary" size="md" icon="calendar">
						Manage schedule
					</Button>
				</Link>
			}
		>
			<ToggleCard data-testid="availability-toggle">
				<div>
					<Eyebrow $gold style={{ marginBottom: 6 }}>
						Availability
					</Eyebrow>
					<div style={{ fontSize: 14, color: "var(--ink-soft)" }}>
						{on
							? "You're visible to buyers in your city."
							: "You're hidden from search. No new job offers."}
					</div>
				</div>
				<Toggle
					$on={on}
					onClick={toggle}
					aria-label="Toggle availability"
				/>
			</ToggleCard>

			<StatsRow>
				<Stat>
					<StatLabel>Pending offers</StatLabel>
					<StatValue>{stats.pending}</StatValue>
				</Stat>
				<Stat>
					<StatLabel>Active jobs</StatLabel>
					<StatValue>{stats.active}</StatValue>
				</Stat>
				<Stat>
					<StatLabel>Completed</StatLabel>
					<StatValue>{stats.completed}</StatValue>
				</Stat>
				<Stat>
					<StatLabel>Rating · Earned</StatLabel>
					<StatValue>{rating.toFixed(1)}</StatValue>
				</Stat>
			</StatsRow>

			<Grid>
				<Section>
					<Eyebrow $gold style={{ marginBottom: 16 }}>
						Job queue
					</Eyebrow>
					{jobs.length === 0 && <Empty>No jobs assigned yet.</Empty>}
					{jobs.map((j) => (
						<Row key={j._id}>
							<div
								style={{
									display: "flex",
									gap: 12,
									alignItems: "center",
								}}
							>
								<Icon name="car" size={20} />
								<div>
									<div
										style={{
											fontSize: 14,
											marginBottom: 4,
										}}
									>
										{j.car.make} {j.car.model} {j.car.year}
									</div>
									<div
										style={{
											fontSize: 12,
											color: "var(--ink-muted)",
										}}
									>
										{j.scheduledFor
											? `${new Date(j.scheduledFor).toLocaleDateString()} · ${j.slot ?? ""}`
											: j.status.replace(/_/g, " ")}
									</div>
								</div>
							</div>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: 14,
								}}
							>
								<span style={{ color: "var(--gold-bright)" }}>
									₦
									{Math.floor(
										j.price * payoutFraction,
									).toLocaleString()}
								</span>
								<Pill
									tone={
										j.status === "in_progress"
											? "gold"
											: j.status === "completed"
												? "good"
												: "ghost"
									}
								>
									{j.status.replace(/_/g, " ")}
								</Pill>
								<Link href={`/inspector/inspections/${j._id}`}>
									<Button variant="secondary" size="sm">
										Open
									</Button>
								</Link>
							</div>
						</Row>
					))}
				</Section>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 24,
					}}
				>
					<Section>
						<Eyebrow $gold style={{ marginBottom: 14 }}>
							Earnings
						</Eyebrow>
						<div
							style={{ fontSize: 12, color: "var(--ink-muted)" }}
						>
							Released
						</div>
						<div
							style={{
								fontFamily: "var(--display)",
								fontSize: 28,
								color: "var(--gold-bright)",
							}}
						>
							₦{earnings.released.toLocaleString()}
						</div>
						<div
							style={{
								fontSize: 12,
								color: "var(--ink-muted)",
								marginTop: 10,
							}}
						>
							Held
						</div>
						<div
							style={{
								fontFamily: "var(--display)",
								fontSize: 22,
							}}
						>
							₦{earnings.held.toLocaleString()}
						</div>
					</Section>

					<Section>
						<Eyebrow $gold style={{ marginBottom: 14 }}>
							Quick links
						</Eyebrow>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 10,
							}}
						>
							<Link href="/inspector/schedule">
								<Button
									variant="secondary"
									size="md"
									fullWidth
									icon="calendar"
								>
									Schedule
								</Button>
							</Link>
							<Link href="/inspector/earnings">
								<Button
									variant="secondary"
									size="md"
									fullWidth
									icon="naira"
								>
									Earnings
								</Button>
							</Link>
						</div>
					</Section>
				</div>
			</Grid>
		</PageShell>
	);
}
