import { AdminQueueWrapper } from "@/libs/AdminWrapper";

export const metadata = { title: "Admin · Overdue" };

export default function AdminOverduePage() {
	return <AdminQueueWrapper kind="overdue" />;
}
