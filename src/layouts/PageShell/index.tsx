"use client";

import type { ReactNode } from "react";
import styled from "styled-components";
import { Eyebrow } from "@/components";
import Navbar from "./Navbar";

interface IProps {
	eyebrow?: string;
	title?: string;
	subtitle?: ReactNode;
	titleEm?: string;
	navTitle?: string;
	showAccount?: boolean;
	notifications?: number;
	maxWidth?: number;
	right?: ReactNode;
	children: ReactNode;
}

const Canvas = styled.div`
    position: relative;
    min-height: 100vh;
    background: var(--bg);
    color: var(--ink);
`;

const Container = styled.div<{ $maxWidth: number }>`
    max-width: ${(p) => p.$maxWidth}px;
    margin: 0 auto;
    padding: 48px 32px 80px;

    @media (max-width: 640px) {
        padding: 24px 20px 60px;
    }
`;

const Head = styled.div`
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 40px;

    @media (max-width: 720px) {
        flex-direction: column;
        align-items: flex-start;
    }
`;

const HeadText = styled.div`
    flex: 1;
`;

const Title = styled.h1`
    font-family: var(--display);
    font-weight: 400;
    font-size: clamp(36px, 5vw, 56px);
    letter-spacing: -0.02em;
    line-height: 1;
    margin: 12px 0 0;

    em {
        font-style: italic;
        color: var(--gold-bright);
    }
`;

const Subtitle = styled.div`
    font-size: 15px;
    color: var(--ink-soft);
    line-height: 1.55;
    margin-top: 16px;
    max-width: 640px;
`;

const Right = styled.div`
    flex-shrink: 0;
`;

export default function PageShell({
	eyebrow,
	title,
	titleEm,
	subtitle,
	navTitle,
	showAccount,
	notifications,
	maxWidth = 1180,
	right,
	children,
}: IProps) {
	return (
		<Canvas>
			<Navbar
				title={navTitle}
				showAccount={showAccount}
				notifications={notifications}
			/>
			<Container $maxWidth={maxWidth}>
				{(title || eyebrow) && (
					<Head>
						<HeadText>
							{eyebrow && <Eyebrow $gold>{eyebrow}</Eyebrow>}
							{title && (
								<Title>
									{title}
									{titleEm && (
										<>
											{" "}
											<em>{titleEm}</em>
										</>
									)}
								</Title>
							)}
							{subtitle && <Subtitle>{subtitle}</Subtitle>}
						</HeadText>
						{right && <Right>{right}</Right>}
					</Head>
				)}
				{children}
			</Container>
		</Canvas>
	);
}
