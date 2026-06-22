"use client";

import styled from "styled-components";

const Box = styled.div<{
	$display?: string;
	$flexDirection?: string;
	$alignItems?: string;
	$justifyContent?: string;
	$gap?: string;
	$padding?: string;
	$margin?: string;
	$background?: string;
	$border?: string;
	$borderRadius?: string;
	$width?: string;
	$height?: string;
	$maxWidth?: string;
	$position?: string;
}>`
    display: ${(p) => p.$display ?? "block"};
    ${(p) => p.$flexDirection && `flex-direction: ${p.$flexDirection};`}
    ${(p) => p.$alignItems && `align-items: ${p.$alignItems};`}
    ${(p) => p.$justifyContent && `justify-content: ${p.$justifyContent};`}
    ${(p) => p.$gap && `gap: ${p.$gap};`}
    ${(p) => p.$padding && `padding: ${p.$padding};`}
    ${(p) => p.$margin && `margin: ${p.$margin};`}
    ${(p) => p.$background && `background: ${p.$background};`}
    ${(p) => p.$border && `border: ${p.$border};`}
    ${(p) => p.$borderRadius && `border-radius: ${p.$borderRadius};`}
    ${(p) => p.$width && `width: ${p.$width};`}
    ${(p) => p.$height && `height: ${p.$height};`}
    ${(p) => p.$maxWidth && `max-width: ${p.$maxWidth};`}
    ${(p) => p.$position && `position: ${p.$position};`}
`;

export default Box;
