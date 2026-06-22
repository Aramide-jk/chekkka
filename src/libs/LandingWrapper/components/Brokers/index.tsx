"use client";

import Link from "next/link";
import styled from "styled-components";
import { Avatar, Button, Eyebrow, Pill } from "@/components";

interface ChatLine {
	from: "broker" | "buyer";
	text: string;
}

const CHAT: ChatLine[] = [
	{
		from: "broker",
		text: "I read the inspection report on your Camry. Suspension flag is real, but easy fix.",
	},
	{
		from: "broker",
		text: "I just spoke to the dealer. Got the price down ₦680,000. Want me to lock it?",
	},
	{
		from: "buyer",
		text: "Yes please.",
	},
	{
		from: "broker",
		text: "Done. I'll coordinate payment and arrange delivery to Lekki by Saturday.",
	},
];

const Section = styled.section`
    padding: 120px 32px;
    max-width: 1280px;
    margin: 0 auto;
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: center;

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
        gap: 60px;
    }
`;

const ChatCard = styled.div`
    padding: 40px;
    background: linear-gradient(140deg, var(--surface-2) 0%, var(--bg-tint) 100%);
    border: 1px solid var(--hairline);
    border-radius: var(--r-md);
    box-shadow: var(--shadow-2);
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 28px;
`;

const Messages = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Bubble = styled.div<{ $from: "broker" | "buyer" }>`
    background: ${(p) =>
		p.$from === "broker" ? "var(--surface)" : "var(--gold-wash-2)"};
    padding: 14px;
    border-radius: 14px;
    font-size: 13px;
    color: ${(p) => (p.$from === "broker" ? "var(--ink-soft)" : "var(--ink)")};
    max-width: 85%;
    ${(p) => p.$from === "buyer" && "margin-left: auto;"}
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

export default function Brokers() {
	return (
		<Section id="brokers">
			<Grid>
				<ChatCard>
					<Header>
						<Avatar name="BA" size={48} />
						<div>
							<div style={{ fontSize: 15, fontWeight: 500 }}>
								Bayo Adekunle
							</div>
							<div
								style={{
									color: "var(--ink-muted)",
									fontSize: 12,
								}}
							>
								Chekka Broker · 142 deals · 4.9★
							</div>
						</div>
						<Pill tone="good" dot style={{ marginLeft: "auto" }}>
							Live
						</Pill>
					</Header>
					<Messages>
						{CHAT.map((m, i) => (
							<Bubble key={i} $from={m.from}>
								{m.text}
							</Bubble>
						))}
					</Messages>
				</ChatCard>

				<div>
					<Eyebrow $gold style={{ marginBottom: 16 }}>
						Chekka Broker Service
					</Eyebrow>
					<Title>
						You read the report.
						<br />
						<em>We do the rest.</em>
					</Title>
					<Lede>
						A Chekka broker takes the report and runs with it —
						negotiates the price, coordinates secure payment,
						arranges delivery. You don't have to meet the seller,
						travel to the car, or handle a single kobo directly.
					</Lede>
					<Link href="/book">
						<Button
							variant="primary"
							size="lg"
							iconRight="chevron-right"
						>
							Get a broker
						</Button>
					</Link>
				</div>
			</Grid>
		</Section>
	);
}
