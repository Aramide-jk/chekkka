"use client";

import styled from "styled-components";

interface CardProps {
	$elev?: boolean;
}

const Card = styled.div<CardProps>`
    background: ${(p) => (p.$elev ? "var(--surface-2)" : "var(--surface)")};
    border: 1px solid var(--hairline);
    border-radius: var(--r-md);
    box-shadow: ${(p) => (p.$elev ? "var(--shadow-2)" : "var(--shadow-1)")};
`;

export default Card;
