"use client";

import Link from "next/link";
import styled from "styled-components";
import { Button, Card, Eyebrow, Icon, type IconName } from "@/components";
import { PageShell } from "@/layouts";

type Status = "pending" | "rejected" | "suspended";

interface IProps {
	status: Status;
}

const COPY: Record<
	Status,
	{
		eyebrow: string;
		title: string;
		titleEm: string;
		icon: IconName;
		body: string;
		cta: string;
		ctaHref: string;
	}
> = {
	pending: {
		eyebrow: "Application received",
		title: "Under",
		titleEm: "review",
		icon: "clock",
		body: "Thanks for applying. Our team is reviewing your documents — most decisions come within 48 hours. We'll email and SMS you the moment we have an update.",
		cta: "Back to home",
		ctaHref: "/",
	},
	rejected: {
		eyebrow: "Application status",
		title: "Application not",
		titleEm: "approved",
		icon: "x",
		body: "Unfortunately we couldn't approve your application at this time. You can reapply after 30 days. If you believe this was a mistake, please contact support.",
		cta: "Contact support",
		ctaHref: "/chat",
	},
	suspended: {
		eyebrow: "Account status",
		title: "Account",
		titleEm: "suspended",
		icon: "warning",
		body: "Your account has been temporarily suspended. This usually happens due to overdue reports or buyer disputes. Please contact admin to resolve.",
		cta: "Contact admin",
		ctaHref: "/chat?context=admin",
	},
};

const Panel = styled(Card)`
    padding: 48px;
    text-align: center;
    max-width: 560px;
    margin: 0 auto;
`;

const IconWrap = styled.div<{ $tone: Status }>`
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: ${(p) =>
		p.$tone === "pending"
			? "var(--gold-wash)"
			: p.$tone === "rejected"
				? "var(--danger-wash)"
				: "var(--caution-wash)"};
    border: 1px solid ${(p) =>
		p.$tone === "pending"
			? "var(--gold-wash-2)"
			: p.$tone === "rejected"
				? "var(--danger-deep)"
				: "var(--caution-deep)"};
    color: ${(p) =>
		p.$tone === "pending"
			? "var(--gold-bright)"
			: p.$tone === "rejected"
				? "var(--danger)"
				: "var(--caution)"};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
`;

const Title = styled.h1`
    font-family: var(--display);
    font-weight: 400;
    font-size: 44px;
    margin: 12px 0;
    letter-spacing: -0.02em;

    em {
        font-style: italic;
        color: var(--gold-bright);
    }
`;

const Body = styled.p`
    color: var(--ink-soft);
    font-size: 15px;
    line-height: 1.6;
    margin-bottom: 28px;
`;

export default function StatusWrapper({ status }: IProps) {
	const c = COPY[status];
	return (
		<PageShell
			navTitle={`Inspector · ${status}`}
			showAccount={false}
			maxWidth={900}
		>
			<Panel data-testid={`status-${status}`}>
				<IconWrap $tone={status}>
					<Icon name={c.icon} size={32} />
				</IconWrap>
				<Eyebrow $gold>{c.eyebrow}</Eyebrow>
				<Title>
					{c.title} <em>{c.titleEm}</em>
				</Title>
				<Body>{c.body}</Body>
				<Link href={c.ctaHref}>
					<Button variant="primary" size="md">
						{c.cta}
					</Button>
				</Link>
			</Panel>
		</PageShell>
	);
}
