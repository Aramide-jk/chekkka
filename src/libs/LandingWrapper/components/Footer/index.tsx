"use client";

import Link from "next/link";
import styled from "styled-components";
import { Eyebrow, Logo } from "@/components";

interface FooterLink {
	label: string;
	href: string;
}

interface Column {
	t: string;
	l: FooterLink[];
}

const COLUMNS: Column[] = [
	{
		t: "Product",
		l: [
			{ label: "Book inspection", href: "/book" },
			{ label: "Plans", href: "/#plans" },
			{ label: "Sample report", href: "/sample-report" },
			{ label: "Broker service", href: "/#brokers" },
		],
	},
	{
		t: "For pros",
		l: [
			{ label: "Become an inspector", href: "/inspector/apply" },
			{ label: "Inspector dashboard", href: "/inspector/dashboard" },
			{ label: "Earnings", href: "/inspector/earnings" },
			{ label: "Certifications", href: "/#inspectors" },
		],
	},
	{
		t: "Company",
		l: [
			{ label: "About", href: "/#trust" },
			{ label: "Press", href: "/#trust" },
			{ label: "Privacy", href: "/privacy" },
			{ label: "Terms", href: "/terms" },
		],
	},
];

const Wrap = styled.footer`
    padding: 60px 32px 40px;
    border-top: 1px solid var(--hairline);
`;

const Inner = styled.div`
    max-width: 1280px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr 1fr;
    gap: 40px;

    @media (max-width: 900px) {
        grid-template-columns: 1fr 1fr;
        gap: 40px;
    }
    @media (max-width: 540px) {
        grid-template-columns: 1fr;
    }
`;

const Brand = styled.p`
    color: var(--ink-muted);
    font-size: 13px;
    margin-top: 16px;
    max-width: 320px;
    line-height: 1.5;
`;

const Stack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 13px;
    color: var(--ink-soft);

    a {
        color: var(--ink-soft);
        text-decoration: none;
        transition: color 0.15s ease;
    }
    a:hover {
        color: var(--gold-bright);
    }
`;

const Bottom = styled.div`
    max-width: 1280px;
    margin: 48px auto 0;
    padding-top: 24px;
    border-top: 1px solid var(--hairline);
    display: flex;
    justify-content: space-between;
    color: var(--ink-faint);
    font-size: 12px;

    @media (max-width: 540px) {
        flex-direction: column;
        gap: 8px;
    }
`;

export default function Footer() {
	return (
		<Wrap>
			<Inner>
				<div>
					<Logo />
					<Brand>
						Nigeria's professional car inspection and verification
						platform. Before you buy — Chekka.
					</Brand>
				</div>
				{COLUMNS.map((c) => (
					<div key={c.t}>
						<Eyebrow style={{ marginBottom: 18 }}>{c.t}</Eyebrow>
						<Stack>
							{c.l.map((x) => (
								<Link key={x.label} href={x.href}>
									{x.label}
								</Link>
							))}
						</Stack>
					</div>
				))}
			</Inner>
			<Bottom>
				<span>© 2026 Chekka Technologies Ltd. Lagos · Nigeria.</span>
				<span>Made with rigor in West Africa.</span>
			</Bottom>
		</Wrap>
	);
}
