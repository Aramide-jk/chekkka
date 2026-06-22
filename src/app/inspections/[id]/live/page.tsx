import { LiveFeedWrapper } from "@/libs/InspectionWrapper";

export const metadata = { title: "Live feed · Chekka" };

export default async function LiveFeedPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <LiveFeedWrapper id={id} />;
}
