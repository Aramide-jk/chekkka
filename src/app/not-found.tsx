"use client";

import Link from "next/link";
import styled from "styled-components";
import { Button, Eyebrow, Logo } from "@/components";

const Canvas = styled.div`
    min-height: 100vh;
    display: grid;
    place-items: center;
    background: var(--bg);
    color: var(--ink);
    padding: 32px;
`;

const Inner = styled.div`
    text-align: center;
    max-width: 480px;
`;

const Code = styled.div`
    font-family: var(--display);
    font-size: 140px;
    color: var(--gold-bright);
    line-height: 1;
    letter-spacing: -0.04em;
`;

const Title = styled.h1`
    font-family: var(--display);
    font-weight: 400;
    font-size: 44px;
    margin: 12px 0 14px;
    letter-spacing: -0.02em;

    em {
        font-style: italic;
        color: var(--gold-bright);
    }
`;

const Body = styled.p`
    color: var(--ink-soft);
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 28px;
`;

export default function NotFound() {
	return (
		<Canvas>
			<Inner>
				<div style={{ marginBottom: 32, display: "inline-block" }}>
					<Logo />
				</div>
				<Eyebrow $gold>Lost in the lot</Eyebrow>
				<Code>404</Code>
				<Title>
					This page doesn't <em>exist</em>
				</Title>
				<Body>
					The car you were looking for isn't on the lot. Head back
					home and we'll point you in the right direction.
				</Body>
				<Link href="/">
					<Button
						variant="primary"
						size="md"
						iconRight="chevron-right"
					>
						Back to home
					</Button>
				</Link>
			</Inner>
		</Canvas>
	);
}
