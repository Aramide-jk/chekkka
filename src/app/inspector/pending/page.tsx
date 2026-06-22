import { StatusWrapper } from "@/libs/InspectorWrapper";

export const metadata = { title: "Application pending · Chekka" };

export default function InspectorPendingPage() {
	return <StatusWrapper status="pending" />;
}
