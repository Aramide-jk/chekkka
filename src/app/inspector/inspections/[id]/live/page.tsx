import { LiveCaptureWrapper } from "@/libs/InspectorWrapper";

export const metadata = { title: "Live capture · Chekka" };

export default async function InspectorLivePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <LiveCaptureWrapper id={id} />;
}
