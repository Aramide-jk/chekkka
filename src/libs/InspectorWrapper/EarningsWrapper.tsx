"use client";

import { useState } from "react";
import styled from "styled-components";
import useSWR from "swr";
import { Button, Card, Eyebrow, Icon, Pill } from "@/components";
import { fetcher } from "@/constants";
import { PageShell } from "@/layouts";
import type { IResponseEnvelope } from "@/types";

interface ITransaction {
	_id: string;
	inspectionId?: string;
	amount: number;
	platformFee: number;
	status: string;
	payoutStatus: "pending" | "held" | "held_dispute" | "released" | "refunded";
	createdAt: string;
}

interface IEarnings {
	aggregate: { released: number; held: number; totalCount: number };
	transactions: ITransaction[];
}

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 24px;
    @media (max-width: 720px) { grid-template-columns: 1fr; }
`;
const Stat = styled(Card)<{ $blur: boolean }>`
    padding: 24px;
    transition: filter 0.2s ease;
    ${(p) => p.$blur && "filter: blur(10px);"}
`;
const Value = styled.div`
    font-family: var(--display);
    font-size: 44px;
    margin-top: 6px;
    color: var(--gold-bright);
`;
const Section = styled(Card)`padding: 24px;`;
const Row = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid var(--hairline);
    font-size: 13px;
    &:last-child { border-bottom: none; }
`;
const Empty = styled.div`
    color: var(--ink-muted);
    padding: 24px 0;
    text-align: center;
    font-size: 13px;
`;

const TONE: Record<string, "good" | "gold" | "caution" | "ghost"> = {
	released: "good",
	held: "gold",
	held_dispute: "caution",
	pending: "ghost",
	refunded: "ghost",
};

export default function EarningsWrapper() {
	const [hide, setHide] = useState(true);
	const { data } = useSWR<IResponseEnvelope<IEarnings>>(
		"/api/transactions/earnings",
		fetcher,
		{ revalidateOnMount: true },
	);
	const aggregate = data?.data?.aggregate ?? {
		released: 0,
		held: 0,
		totalCount: 0,
	};
	const txs = data?.data?.transactions ?? [];

	const released = aggregate.released;
	const held = aggregate.held;
	const lifetime = released + held;

	return (
		<PageShell
			eyebrow="Earnings"
			title="Your"
			titleEm="payouts"
			navTitle="Earnings"
			subtitle="Held for 48 hours after report submission. Released automatically if there are no disputes."
			right={
				<Button
					variant="ghost"
					size="sm"
					icon={hide ? "eye" : "eye-off"}
					onClick={() => setHide(!hide)}
				>
					{hide ? "Reveal" : "Hide"} amounts
				</Button>
			}
		>
			<Grid>
				<Stat $blur={hide}>
					<Eyebrow $gold>Released</Eyebrow>
					<Value>₦{released.toLocaleString()}</Value>
				</Stat>
				<Stat $blur={hide}>
					<Eyebrow $gold>Held</Eyebrow>
					<Value>₦{held.toLocaleString()}</Value>
				</Stat>
				<Stat $blur={hide}>
					<Eyebrow $gold>Lifetime</Eyebrow>
					<Value>₦{lifetime.toLocaleString()}</Value>
				</Stat>
			</Grid>

			<Section data-testid="payouts-table">
				<Eyebrow $gold style={{ marginBottom: 14 }}>
					Recent payouts ({txs.length})
				</Eyebrow>
				{txs.length === 0 && <Empty>No payouts yet.</Empty>}
				{txs.map((t) => (
					<Row key={t._id}>
						<div
							style={{
								display: "flex",
								gap: 12,
								alignItems: "center",
							}}
						>
							<Icon name="car" size={16} />
							<span>Inspection</span>
						</div>
						<div style={{ color: "var(--ink-muted)" }}>
							{new Date(t.createdAt).toLocaleDateString()}
						</div>
						<div
							style={{
								color: "var(--gold-bright)",
								filter: hide ? "blur(8px)" : "none",
							}}
						>
							₦{(t.amount - t.platformFee).toLocaleString()}
						</div>
						<Pill tone={TONE[t.payoutStatus] ?? "ghost"}>
							{t.payoutStatus}
						</Pill>
					</Row>
				))}
			</Section>
		</PageShell>
	);
}
