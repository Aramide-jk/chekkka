import { ReportWrapper } from "@/libs/InspectorWrapper";

export const metadata = { title: "Submit report · Chekka" };

export default async function InspectorReportPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <ReportWrapper id={id} />;
}
