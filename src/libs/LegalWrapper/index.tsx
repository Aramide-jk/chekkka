"use client";

import styled from "styled-components";
import { Card } from "@/components";
import { PageShell } from "@/layouts";

type Kind = "terms" | "privacy";

interface IProps {
	kind: Kind;
}

const COPY: Record<
	Kind,
	{
		title: string;
		titleEm: string;
		sections: Array<{ h: string; p: string }>;
	}
> = {
	terms: {
		title: "Terms of",
		titleEm: "service",
		sections: [
			{
				h: "1. Acceptance",
				p: "By creating a Chekka account you agree to these terms. Chekka Technologies Ltd ('Chekka', 'we') is registered in Lagos, Nigeria.",
			},
			{
				h: "2. The service",
				p: "Chekka connects car buyers with certified independent inspectors who physically inspect a car on the buyer's behalf and submit a structured report.",
			},
			{
				h: "3. Payments and escrow",
				p: "All buyer payments are processed via Paystack and held by the platform until the report is submitted and the dispute window has elapsed.",
			},
			{
				h: "4. Inspector obligations",
				p: "Approved inspectors agree to inspect the car as described, submit a complete report within 48 h of the visit, and adhere to Chekka's professional standards.",
			},
			{
				h: "5. Liability",
				p: "Chekka's reports are professional opinions, not warranties. We are not party to the sale and do not guarantee the future condition or safety of the vehicle.",
			},
		],
	},
	privacy: {
		title: "Privacy",
		titleEm: "policy",
		sections: [
			{
				h: "What we collect",
				p: "Account details (name, email, phone), payment metadata via Paystack, inspection content (photos, notes, reports), and chat messages.",
			},
			{
				h: "How we use it",
				p: "To match you with an inspector, deliver reports, process payments, and improve the platform.",
			},
			{
				h: "Sharing",
				p: "Inspectors see your name and contact during an active inspection. Brokers see the same plus payment-coordination details. We never sell your data.",
			},
			{
				h: "Storage",
				p: "Data is stored on MongoDB Atlas (eu-west) and AWS S3 (eu-west-1) with encryption at rest and in transit.",
			},
			{
				h: "Your rights",
				p: "You may request access, correction, or deletion of your data by emailing privacy@chekka.com.",
			},
		],
	},
};

const Stack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 720px;
`;

const Block = styled(Card)`
    padding: 24px;
`;

const H = styled.h2`
    font-family: var(--display);
    font-size: 22px;
    margin: 0 0 10px;
`;

const P = styled.p`
    color: var(--ink-soft);
    line-height: 1.65;
    font-size: 14px;
`;

export default function LegalWrapper({ kind }: IProps) {
	const c = COPY[kind];
	return (
		<PageShell
			eyebrow={kind === "terms" ? "Terms" : "Privacy"}
			title={c.title}
			titleEm={c.titleEm}
			navTitle={kind === "terms" ? "Terms" : "Privacy"}
			showAccount={false}
			subtitle="Last updated 1 May 2026. By using Chekka you agree to these terms."
		>
			<Stack>
				{c.sections.map((s) => (
					<Block key={s.h}>
						<H>{s.h}</H>
						<P>{s.p}</P>
					</Block>
				))}
			</Stack>
		</PageShell>
	);
}
