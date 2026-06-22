"use client";

import styled from "styled-components";
import {
	Brokers,
	Footer,
	Header,
	Hero,
	HowItWorks,
	InspectorCTA,
	Plans,
	StatsStrip,
	Trust,
} from "./components";

const Canvas = styled.div`
    position: relative;
    min-height: 100vh;
    background: var(--bg);
    color: var(--ink);
`;

export default function LandingWrapper() {
	return (
		<Canvas>
			<Header />
			<Hero />
			<StatsStrip />
			<HowItWorks />
			<Plans />
			<Trust />
			<Brokers />
			<InspectorCTA />
			<Footer />
		</Canvas>
	);
}
