import type { Metadata } from "next";

interface ISeoOptions {
	title?: string;
	description?: string;
	path?: string;
	imageUrl?: string;
}

const DEFAULT_TITLE = "Chekka — Before you buy, we inspect it.";
const DEFAULT_DESCRIPTION =
	"Nigeria's professional car inspection and verification platform. Certified inspectors visit the car on your behalf, document every detail in real time, and deliver a verdict — before you spend a single naira.";
const DEFAULT_URL = "https://chekka.ng";

export default function getSeoMetadata(opts: ISeoOptions = {}): Metadata {
	const title = opts.title ?? DEFAULT_TITLE;
	const description = opts.description ?? DEFAULT_DESCRIPTION;
	const url = `${DEFAULT_URL}${opts.path ?? ""}`;

	return {
		title,
		description,
		metadataBase: new URL(DEFAULT_URL),
		alternates: { canonical: url },
		openGraph: {
			title,
			description,
			url,
			siteName: "Chekka",
			locale: "en_NG",
			type: "website",
			...(opts.imageUrl ? { images: [{ url: opts.imageUrl }] } : {}),
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			...(opts.imageUrl ? { images: [opts.imageUrl] } : {}),
		},
	};
}
