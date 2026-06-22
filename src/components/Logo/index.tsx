"use client";

import styled from "styled-components";

interface IProps {
	size?: number;
	withText?: boolean;
	accent?: string;
}

const Wrap = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--ink);
`;

const Wordmark = styled.span<{ $size: number }>`
    font-family: var(--display);
    letter-spacing: -0.02em;
    font-size: ${(p) => p.$size + 4}px;
    line-height: 1;
`;

export default function Logo({
	size = 22,
	withText = true,
	accent = "var(--gold)",
}: IProps) {
	return (
		<Wrap>
			<svg width={size} height={size} viewBox="0 0 24 24" fill="none">
				<path
					d="M12 2L3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6z"
					fill={accent}
					fillOpacity="0.14"
					stroke={accent}
					strokeWidth="1.4"
				/>
				<path
					d="M8 12l3 3 5-5"
					stroke={accent}
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
			{withText && <Wordmark $size={size}>Chekka</Wordmark>}
		</Wrap>
	);
}
