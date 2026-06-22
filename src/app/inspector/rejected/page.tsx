import { StatusWrapper } from "@/libs/InspectorWrapper";

export const metadata = { title: "Application rejected · Chekka" };

export default function InspectorRejectedPage() {
	return <StatusWrapper status="rejected" />;
}
