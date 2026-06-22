"use client";

import styled from "styled-components";

interface IProps {
	name?: string;
	size?: number;
}

const Wrap = styled.span<{ $size: number }>`
    width: ${(p) => p.$size}px;
    height: ${(p) => p.$size}px;
    font-size: ${(p) => p.$size * 0.42}px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--display);
    background: linear-gradient(135deg, var(--surface-3), var(--surface-2));
    color: var(--gold);
    border: 1px solid var(--hairline);
    overflow: hidden;
    flex-shrink: 0;
`;

export default function Avatar({ name = "?", size = 36 }: IProps) {
	const initials = name.slice(0, 2).toUpperCase();
	return <Wrap $size={size}>{initials}</Wrap>;
}
