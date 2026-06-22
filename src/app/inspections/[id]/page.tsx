import { InspectionWrapper } from "@/libs/InspectionWrapper";

export const metadata = { title: "Inspection · Chekka" };

export default async function InspectionPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <InspectionWrapper id={id} />;
}
