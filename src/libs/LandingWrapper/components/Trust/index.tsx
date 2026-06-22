"use client";

import styled from "styled-components";
import { Eyebrow, Icon, type IconName } from "@/components";
import SampleReportCard from "../SampleReportCard";

interface Pillar {
	i: IconName;
	t: string;
	d: string;
}

const PILLARS: Pillar[] = [
	{
		i: "shield-check",
		t: "Independent inspectors",
		d: "Inspectors don't work for sellers or dealerships. Their incentive is one thing: accuracy.",
	},
	{
		i: "camera",
		t: "Photographic proof",
		d: "Every claim in your report is backed by timestamped photos uploaded live from the field.",
	},
	{
		i: "naira",
		t: "Escrow-protected payment",
		d: "Money sits in escrow for 48 hours. Dispute it and we hold longer. Never lose a kobo to a bad inspection.",
	},
];

const Section = styled.section`
    padding: 100px 32px;
    background: var(--bg-tint);
    border-top: 1px solid var(--hairline);
    border-bottom: 1px solid var(--hairline);
`;

const Inner = styled.div`
    max-width: 1280px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: center;

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
        gap: 60px;
    }
`;

const Title = styled.h2`
    font-family: var(--display);
    font-size: 56px;
    line-height: 1;
    margin: 0 0 24px;
    letter-spacing: -0.02em;

    em {
        font-style: italic;
        color: var(--gold-bright);
    }
`;

const Lede = styled.p`
    color: var(--ink-soft);
    font-size: 16px;
    margin-bottom: 32px;
    max-width: 480px;
`;

const Pillars = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const PillarRow = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 16px;
`;

const IconBox = styled.div`
    width: 40px;
    height: 40px;
    border-radius: 10px;
    border: 1px solid var(--hairline-strong);
    background: var(--gold-wash);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--gold-bright);
    flex-shrink: 0;
`;

export default function Trust() {
	return (
		<Section id="trust">
			<Inner>
				<div>
					<Eyebrow $gold style={{ marginBottom: 16 }}>
						Why people trust Chekka
					</Eyebrow>
					<Title>
						Your money is <em>safe</em>
						<br />
						until the job is done.
					</Title>
					<Lede>
						Buyers pay Chekka, not the inspector. We hold the funds
						in escrow for 48 hours after the report lands — and
						release them only when you have no complaints.
					</Lede>
					<Pillars>
						{PILLARS.map((p) => (
							<PillarRow key={p.t}>
								<IconBox>
									<Icon name={p.i} size={20} />
								</IconBox>
								<div>
									<div
										style={{
											fontSize: 15,
											fontWeight: 500,
											marginBottom: 4,
										}}
									>
										{p.t}
									</div>
									<p
										style={{
											color: "var(--ink-muted)",
											fontSize: 13,
											lineHeight: 1.5,
										}}
									>
										{p.d}
									</p>
								</div>
							</PillarRow>
						))}
					</Pillars>
				</div>

				<SampleReportCard />
			</Inner>
		</Section>
	);
}
