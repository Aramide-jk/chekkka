import { AdminQueueWrapper } from "@/libs/AdminWrapper";

export const metadata = { title: "Admin · Live inspections" };

export default function AdminLivePage() {
	return <AdminQueueWrapper kind="live" />;
}
