"use client";

import styled from "styled-components";
import { Eyebrow } from "@/components";

const STEPS = [
	{
		n: "01",
		t: "Find a car",
		d: "You spot a car you like — at a dealership or private seller. Anywhere in Nigeria.",
	},
	{
		n: "02",
		t: "Book a Chekka",
		d: "Choose a plan, pick a certified inspector, and schedule the visit. Pay securely via Paystack.",
	},
	{
		n: "03",
		t: "Watch live",
		d: "While the inspector is at the car, every photo and finding streams to your screen in real time.",
	},
	{
		n: "04",
		t: "Read the verdict",
		d: "Within 48 hours, you get a structured report with a clear: Worth Buying · With Caution · Not Recommended.",
	},
	{
		n: "05",
		t: "Or hand it to us",
		d: "Want to take it further? A Chekka broker can negotiate, pay, and arrange delivery on your behalf.",
	},
] as const;

const Section = styled.section`
    padding: 120px 32px;
    max-width: 1280px;
    margin: 0 auto;
`;

const Heading = styled.div`
    text-align: center;
    margin-bottom: 80px;
`;

const Title = styled.h2`
    font-family: var(--display);
    font-weight: 400;
    font-size: 64px;
    margin: 0 0 20px;
    letter-spacing: -0.02em;
    line-height: 1;

    em {
        font-style: italic;
        color: var(--gold-bright);
    }
`;

const Lede = styled.p`
    color: var(--ink-soft);
    max-width: 560px;
    margin: 0 auto;
    font-size: 16px;
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1px;
    background: var(--hairline);
    border: 1px solid var(--hairline);
    border-radius: 22px;
    overflow: hidden;

    @media (max-width: 1100px) {
        grid-template-columns: repeat(2, 1fr);
    }
    @media (max-width: 640px) {
        grid-template-columns: 1fr;
    }
`;

const Cell = styled.div`
    padding: 32px 22px;
    background: var(--surface);
    min-height: 240px;
`;

const Num = styled.div`
    font-family: var(--display);
    font-size: 28px;
    color: var(--gold);
    margin-bottom: 28px;
`;

const StepTitle = styled.div`
    font-family: var(--display);
    font-size: 24px;
    margin-bottom: 10px;
`;

const Desc = styled.p`
    font-size: 13px;
    color: var(--ink-muted);
    line-height: 1.5;
`;

export default function HowItWorks() {
	return (
		<Section id="how">
			<Heading>
				<Eyebrow $gold style={{ marginBottom: 16 }}>
					The Chekka Process
				</Eyebrow>
				<Title>
					Five steps. <em>Zero risk.</em>
				</Title>
				<Lede>
					From the moment you find a car you like to the moment you
					decide whether to buy — we hold your hand.
				</Lede>
			</Heading>

			<Grid>
				{STEPS.map((s) => (
					<Cell key={s.n}>
						<Num>{s.n}</Num>
						<StepTitle>{s.t}</StepTitle>
						<Desc>{s.d}</Desc>
					</Cell>
				))}
			</Grid>
		</Section>
	);
}
