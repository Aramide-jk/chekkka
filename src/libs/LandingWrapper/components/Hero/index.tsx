"use client";

import Link from "next/link";
import styled from "styled-components";
import { Button, Eyebrow, Icon } from "@/components";
import LiveFeedPreview from "../LiveFeedPreview";

const Section = styled.section`
    position: relative;
    padding: 80px 32px 100px;
    max-width: 1280px;
    margin: 0 auto;
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: 60px;
    align-items: center;

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
        gap: 60px;
    }
`;

const Badge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 6px 14px;
    border: 1px solid var(--hairline-strong);
    border-radius: 999px;
    margin-bottom: 32px;
`;

const Dot = styled.span`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--gold-bright);
    display: inline-block;
`;

const Title = styled.h1`
    font-family: var(--display);
    font-weight: 400;
    font-size: clamp(56px, 7vw, 96px);
    line-height: 0.95;
    margin-bottom: 24px;
    letter-spacing: -0.02em;

    em {
        font-style: italic;
        color: var(--gold-bright);
    }
`;

const Sub = styled.p`
    font-size: 18px;
    line-height: 1.5;
    color: var(--ink-soft);
    max-width: 520px;
    margin-bottom: 36px;
`;

const Buttons = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;

    @media (max-width: 540px) {
        flex-direction: column;
        align-items: stretch;
        button { width: 100%; justify-content: center; }
    }
`;

const Trust = styled.div`
    display: flex;
    gap: 32px;
    margin-top: 56px;
    color: var(--ink-muted);
    font-size: 12px;

    @media (max-width: 540px) {
        flex-direction: column;
        gap: 12px;
    }
`;

const TrustItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

export default function Hero() {
	return (
		<Section>
			<Grid>
				<div>
					<Badge>
						<Dot />
						<Eyebrow $gold style={{ fontSize: 10 }}>
							Now serving Lagos · Abuja · Port Harcourt · Kano
						</Eyebrow>
					</Badge>
					<Title>
						Before you
						<br />
						<em>buy</em> the car,
						<br />
						we inspect it.
					</Title>
					<Sub>
						A certified Chekka inspector visits the car on your
						behalf, documents every detail in real time, and
						delivers a verdict — before you spend a single naira.
					</Sub>
					<Buttons>
						<Link href="/book">
							<Button
								variant="primary"
								size="lg"
								iconRight="chevron-right"
							>
								Book an inspection
							</Button>
						</Link>
						<Link href="/sample-report">
							<Button variant="secondary" size="lg">
								See a sample report
							</Button>
						</Link>
					</Buttons>
					<Trust>
						<TrustItem>
							<Icon
								name="shield-check"
								size={16}
								style={{ color: "var(--gold)" }}
							/>
							<span>Certified inspectors</span>
						</TrustItem>
						<TrustItem>
							<Icon
								name="camera"
								size={16}
								style={{ color: "var(--gold)" }}
							/>
							<span>Live photo feed</span>
						</TrustItem>
						<TrustItem>
							<Icon
								name="naira"
								size={16}
								style={{ color: "var(--gold)" }}
							/>
							<span>Escrow payments</span>
						</TrustItem>
					</Trust>
				</div>

				<LiveFeedPreview />
			</Grid>
		</Section>
	);
}
