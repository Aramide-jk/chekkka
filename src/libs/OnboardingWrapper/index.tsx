"use client";

import Link from "next/link";
import { useState } from "react";
import styled from "styled-components";
import { Button, Eyebrow, Icon, type IconName, Logo } from "@/components";

interface Slide {
	icon: IconName;
	eyebrow: string;
	title: string;
	titleEm: string;
	body: string;
}

const SLIDES: Slide[] = [
	{
		icon: "shield-check",
		eyebrow: "Step 1 · Certified",
		title: "A certified inspector",
		titleEm: "on your behalf",
		body: "We send a vetted independent professional to physically examine the car. They photograph every panel, every system. They work for you — not the seller.",
	},
	{
		icon: "camera",
		eyebrow: "Step 2 · Real-time",
		title: "Watch it happen",
		titleEm: "live",
		body: "From the moment they arrive, every photo and finding streams to your screen in real time. You see the car as if you were standing right there.",
	},
	{
		icon: "naira",
		eyebrow: "Step 3 · Verdict",
		title: "Decide with",
		titleEm: "confidence",
		body: "Within 48 hours of the visit you receive a structured report: every checkpoint, every photo, a final verdict, and a remediation list — so you can decide before you spend a kobo.",
	},
];

const Canvas = styled.div`
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr auto;
    background: var(--bg);
    color: var(--ink);
`;

const Top = styled.div`
    padding: 24px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--hairline);
`;

const StepCount = styled.div`
    color: var(--ink-muted);
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
`;

const Body = styled.section`
    display: grid;
    place-items: center;
    padding: 64px 32px;
`;

const Slide = styled.div`
    max-width: 540px;
    text-align: center;
    animation: fadeUp 0.3s ease both;
`;

const IconWrap = styled.div`
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--gold-wash);
    border: 1px solid var(--gold-wash-2);
    color: var(--gold-bright);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 32px;
`;

const Title = styled.h1`
    font-family: var(--display);
    font-weight: 400;
    font-size: clamp(40px, 6vw, 64px);
    line-height: 1;
    letter-spacing: -0.02em;
    margin: 16px 0;

    em {
        font-style: italic;
        color: var(--gold-bright);
    }
`;

const Lede = styled.p`
    color: var(--ink-soft);
    font-size: 16px;
    line-height: 1.6;
    margin-top: 24px;
`;

const Bottom = styled.div`
    padding: 24px 32px;
    border-top: 1px solid var(--hairline);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
`;

const Dots = styled.div`
    display: flex;
    gap: 8px;
`;

const Dot = styled.span<{ $on: boolean }>`
    width: ${(p) => (p.$on ? 24 : 8)}px;
    height: 8px;
    border-radius: 4px;
    background: ${(p) => (p.$on ? "var(--gold-bright)" : "var(--surface-3)")};
    transition: all 0.2s ease;
`;

const Actions = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

export default function OnboardingWrapper() {
	const [i, setI] = useState(0);
	const slide = SLIDES[i];
	const isLast = i === SLIDES.length - 1;

	return (
		<Canvas>
			<Top>
				<Logo />
				<StepCount>
					{i + 1} of {SLIDES.length}
				</StepCount>
			</Top>
			<Body>
				<Slide key={i} data-testid={`onboarding-slide-${i}`}>
					<IconWrap>
						<Icon name={slide.icon} size={32} />
					</IconWrap>
					<Eyebrow $gold>{slide.eyebrow}</Eyebrow>
					<Title>
						{slide.title} <em>{slide.titleEm}</em>
					</Title>
					<Lede>{slide.body}</Lede>
				</Slide>
			</Body>
			<Bottom>
				<Dots>
					{SLIDES.map((s, idx) => (
						<Dot key={s.eyebrow} $on={idx <= i} />
					))}
				</Dots>
				<Actions>
					<Button
						variant="ghost"
						size="md"
						onClick={() => setI(Math.max(0, i - 1))}
						disabled={i === 0}
					>
						Back
					</Button>
					{isLast ? (
						<Link href="/dashboard">
							<Button
								variant="primary"
								size="md"
								iconRight="chevron-right"
							>
								Enter Chekka
							</Button>
						</Link>
					) : (
						<Button
							variant="primary"
							size="md"
							iconRight="chevron-right"
							onClick={() => setI(i + 1)}
						>
							Continue
						</Button>
					)}
				</Actions>
			</Bottom>
		</Canvas>
	);
}
