"use client";

import styled from "styled-components";
import { Eyebrow } from "@/components";

const STATS = [
	{ n: "12,400+", l: "Inspections completed" },
	{ n: "₦18B+", l: "In purchase decisions" },
	{ n: "97%", l: "Buyer satisfaction" },
	{ n: "48h", l: "Standard turnaround" },
] as const;

const Section = styled.section`
    border-top: 1px solid var(--hairline);
    border-bottom: 1px solid var(--hairline);
    background: var(--bg-tint);
`;

const Inner = styled.div`
    max-width: 1280px;
    margin: 0 auto;
    padding: 40px 32px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 32px;

    @media (max-width: 900px) {
        grid-template-columns: repeat(2, 1fr);
        gap: 32px 24px;
    }
`;

const StatNumber = styled.div`
    font-family: var(--display);
    font-variant-numeric: tabular-nums;
    font-size: 44px;
    color: var(--gold-bright);
    line-height: 1;
`;

export default function StatsStrip() {
	return (
		<Section>
			<Inner>
				{STATS.map((s) => (
					<div key={s.l}>
						<StatNumber>{s.n}</StatNumber>
						<Eyebrow style={{ marginTop: 6 }}>{s.l}</Eyebrow>
					</div>
				))}
			</Inner>
		</Section>
	);
}
