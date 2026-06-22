"use client";

import Link from "next/link";
import styled from "styled-components";
import { Button, Eyebrow, Icon, Pill } from "@/components";

interface Plan {
	name: string;
	price: string;
	desc: string;
	features: string[];
	tone: "primary" | "secondary";
	popular?: boolean;
	href: string;
	cta: string;
}

const PLANS: Plan[] = [
	{
		name: "Standard",
		price: "₦32,000",
		desc: "Complete inspection. Every panel, every system. Fixed price. 48-hour turnaround.",
		features: [
			"50+ checkpoints",
			"30+ live photos",
			"Full structured report",
			"Verdict + remediation list",
		],
		tone: "secondary",
		href: "/book?type=standard",
		cta: "Choose Standard",
	},
	{
		name: "Premium",
		price: "₦52,000",
		desc: "Priority pool. Top-rated inspectors only. 24-hour turnaround.",
		features: [
			"Everything in Standard",
			"Top-tier inspectors",
			"OBD2 diagnostic scan",
			"Road test video clips",
			"Priority report delivery",
		],
		tone: "primary",
		popular: true,
		href: "/book?type=premium",
		cta: "Choose Premium",
	},
	{
		name: "Special Request",
		price: "Custom",
		desc: "Salvage cars, classics, fleet purchases. We tailor the inspection to your situation.",
		features: [
			"Consultant-led intake",
			"Custom checklist",
			"Specialist inspectors",
			"Direct admin oversight",
		],
		tone: "secondary",
		href: "/chat?context=special-request",
		cta: "Talk to a consultant",
	},
];

const Section = styled.section`
    padding: 60px 32px 120px;
    max-width: 1280px;
    margin: 0 auto;
`;

const Heading = styled.div`
    text-align: center;
    margin-bottom: 56px;
`;

const Title = styled.h2`
    font-family: var(--display);
    font-size: 56px;
    letter-spacing: -0.02em;
    line-height: 1;
    margin: 0;

    em {
        font-style: italic;
        color: var(--gold-bright);
    }
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;

    @media (max-width: 1100px) {
        grid-template-columns: 1fr;
    }
`;

const Card = styled.div<{ $popular?: boolean }>`
    padding: 32px;
    position: relative;
    background: ${(p) =>
		p.$popular
			? "linear-gradient(180deg, var(--surface-2), var(--surface))"
			: "var(--surface)"};
    border: 1px solid ${(p) =>
		p.$popular ? "var(--gold-wash-2)" : "var(--hairline)"};
    border-radius: var(--r-md);
    box-shadow: ${(p) =>
		p.$popular ? "var(--shadow-gold)" : "var(--shadow-1)"};
`;

const PopularTag = styled.div`
    position: absolute;
    top: -12px;
    left: 24px;
`;

const Name = styled.div<{ $popular?: boolean }>`
    font-family: var(--display);
    font-size: 34px;
    margin-bottom: 6px;
    color: ${(p) => (p.$popular ? "var(--gold-bright)" : "var(--ink)")};
`;

const Price = styled.div`
    font-family: var(--display);
    font-variant-numeric: tabular-nums;
    font-size: 48px;
    margin-bottom: 12px;
`;

const Desc = styled.p`
    color: var(--ink-muted);
    font-size: 13px;
    margin-bottom: 24px;
    line-height: 1.5;
`;

const Features = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 28px;
`;

const Feature = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
`;

export default function Plans() {
	return (
		<Section id="plans">
			<Heading>
				<Eyebrow $gold style={{ marginBottom: 16 }}>
					Inspection Plans
				</Eyebrow>
				<Title>
					Pick the plan, <em>pick the inspector.</em>
				</Title>
			</Heading>

			<Grid>
				{PLANS.map((p) => (
					<Card key={p.name} $popular={p.popular}>
						{p.popular && (
							<PopularTag>
								<Pill tone="gold">Most chosen</Pill>
							</PopularTag>
						)}
						<Name $popular={p.popular}>{p.name}</Name>
						<Price>{p.price}</Price>
						<Desc>{p.desc}</Desc>
						<Features>
							{p.features.map((f) => (
								<Feature key={f}>
									<Icon
										name="check"
										size={14}
										style={{ color: "var(--gold)" }}
									/>
									<span>{f}</span>
								</Feature>
							))}
						</Features>
						<Link href={p.href} style={{ display: "block" }}>
							<Button variant={p.tone} size="lg" fullWidth>
								{p.cta}
							</Button>
						</Link>
					</Card>
				))}
			</Grid>
		</Section>
	);
}
