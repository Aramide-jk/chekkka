"use client";

import Link from "next/link";
import styled from "styled-components";
import { Button, Card, Eyebrow } from "@/components";

const STATS = [
	{ n: "₦42k", l: "Avg per inspection" },
	{ n: "8–14", l: "Jobs per week" },
	{ n: "48h", l: "Payout window" },
] as const;

const Section = styled.section`
    padding: 100px 32px;
    max-width: 1280px;
    margin: 0 auto;
`;

const Card2 = styled.div`
    padding: 60px 56px;
    background: linear-gradient(120deg, var(--surface-2), var(--bg-tint));
    border: 1px solid var(--gold-wash-2);
    border-radius: var(--r-md);
    box-shadow: var(--shadow-2);
    position: relative;
    overflow: hidden;

    @media (max-width: 700px) {
        padding: 40px 28px;
    }
`;

const Glow = styled.div`
    position: absolute;
    inset: 0;
    opacity: 0.4;
    background: radial-gradient(circle at 80% 50%, var(--gold-wash) 0%, transparent 50%);
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 60px;
    align-items: center;
    position: relative;

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
        gap: 40px;
    }
`;

const Title = styled.h2`
    font-family: var(--display);
    font-size: 52px;
    line-height: 1;
    margin: 0 0 20px;
    letter-spacing: -0.02em;
`;

const Lede = styled.p`
    color: var(--ink-soft);
    font-size: 15px;
    max-width: 480px;
    margin-bottom: 28px;
`;

const StatsCol = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const StatCard = styled(Card)`
    padding: 16px 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const StatNum = styled.span`
    font-family: var(--display);
    font-variant-numeric: tabular-nums;
    font-size: 28px;
    color: var(--gold-bright);
`;

export default function InspectorCTA() {
	return (
		<Section id="inspectors">
			<Card2>
				<Glow />
				<Grid>
					<div>
						<Eyebrow $gold style={{ marginBottom: 14 }}>
							For Inspectors
						</Eyebrow>
						<Title>
							Get paid to do
							<br />
							what you already do well.
						</Title>
						<Lede>
							Certified automotive technicians earn
							₦25,000–₦60,000 per inspection. Set your own
							schedule. Get paid in 48 hours.
						</Lede>
						<Link href="/inspector/apply">
							<Button
								variant="primary"
								size="lg"
								iconRight="chevron-right"
							>
								Apply as inspector
							</Button>
						</Link>
					</div>
					<StatsCol>
						{STATS.map((s) => (
							<StatCard key={s.l}>
								<span
									style={{
										color: "var(--ink-muted)",
										fontSize: 13,
									}}
								>
									{s.l}
								</span>
								<StatNum>{s.n}</StatNum>
							</StatCard>
						))}
					</StatsCol>
				</Grid>
			</Card2>
		</Section>
	);
}
