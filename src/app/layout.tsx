import { DM_Sans, Instrument_Serif } from "next/font/google";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { BodyWrapper, StyledComponentsRegistry } from "@/components";
import { defaultEnvOptions, getSeoMetadata } from "@/constants";

export const metadata = getSeoMetadata();

const dmSans = DM_Sans({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
	variable: "--font-dm-sans",
});

const instrumentSerif = Instrument_Serif({
	subsets: ["latin"],
	weight: ["400"],
	style: ["normal", "italic"],
	variable: "--font-instrument-serif",
});

export default async function RootLayout({
	children,
}: Readonly<{ children: ReactNode }>) {
	const cookieStore = await cookies();
	const cookieHeader = cookieStore.toString();

	const env = defaultEnvOptions();

	return (
		<html lang="en" data-theme="dark">
			<head>
				<style>{`html,body{background:#0E0D0A;color:#F5F1E8}`}</style>
			</head>
			<body className={`${dmSans.variable} ${instrumentSerif.variable}`}>
				<div id="modal-popup"></div>
				<StyledComponentsRegistry>
					<BodyWrapper env={env} cookieHeader={cookieHeader}>
						{children}
					</BodyWrapper>
				</StyledComponentsRegistry>
			</body>
		</html>
	);
}
