"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import styled from "styled-components";
import { Eyebrow, Logo } from "@/components";

interface IProps {
	eyebrow: string;
	title: string;
	titleEm?: string;
	subtitle: string;
	footer?: ReactNode;
	children: ReactNode;
}

const Canvas = styled.div`
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1.05fr 1fr;
    background: var(--bg);
    color: var(--ink);

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
    }
`;

const Left = styled.div`
    padding: 32px 48px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border-right: 1px solid var(--hairline);
    background:
        radial-gradient(60% 60% at 20% 10%, var(--gold-wash) 0%, transparent 60%),
        var(--bg-tint);

    @media (max-width: 900px) {
        display: none;
    }
`;

const Quote = styled.div`
    max-width: 460px;

    blockquote {
        font-family: var(--display);
        font-size: 36px;
        line-height: 1.15;
        letter-spacing: -0.02em;

        em {
            font-style: italic;
            color: var(--gold-bright);
        }
    }

    cite {
        display: block;
        margin-top: 22px;
        font-style: normal;
        color: var(--ink-muted);
        font-size: 12px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
    }
`;

const Right = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 32px;
`;

const Form = styled.div`
    width: 100%;
    max-width: 440px;
`;

const Title = styled.h1`
    font-family: var(--display);
    font-weight: 400;
    font-size: 44px;
    letter-spacing: -0.02em;
    line-height: 1;
    margin: 12px 0 14px;

    em {
        font-style: italic;
        color: var(--gold-bright);
    }
`;

const Subtitle = styled.p`
    color: var(--ink-soft);
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 32px;
`;

const Footer = styled.div`
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid var(--hairline);
    color: var(--ink-muted);
    font-size: 13px;

    a {
        color: var(--gold-bright);

        &:hover { text-decoration: underline; }
    }
`;

export default function AuthShell({
	eyebrow,
	title,
	titleEm,
	subtitle,
	footer,
	children,
}: IProps) {
	return (
		<Canvas>
			<Left>
				<Link href="/">
					<Logo />
				</Link>
				<Quote>
					<blockquote>
						Before you buy — <em>Chekka</em>.
					</blockquote>
					<cite>Nigeria's certified inspection platform</cite>
				</Quote>
				<div style={{ color: "var(--ink-faint)", fontSize: 12 }}>
					© 2026 Chekka Technologies Ltd. Lagos · Nigeria.
				</div>
			</Left>
			<Right>
				<Form>
					<Eyebrow $gold>{eyebrow}</Eyebrow>
					<Title>
						{title}
						{titleEm && (
							<>
								{" "}
								<em>{titleEm}</em>
							</>
						)}
					</Title>
					<Subtitle>{subtitle}</Subtitle>
					{children}
					{footer && <Footer>{footer}</Footer>}
				</Form>
			</Right>
		</Canvas>
	);
}
