import { notFound } from "next/navigation";
import { InspectionWrapper } from "@/libs/InspectionWrapper";
import { connectMongoDB } from "@/server/databases/mongoDB";
import { resolveShareNonce } from "@/server/services/inspections";

export const runtime = "nodejs";
export const metadata = { title: "Shared report · Chekka" };

export default async function SharedReportPage({
	params,
}: {
	params: Promise<{ nonce: string }>;
}) {
	const { nonce } = await params;
	await connectMongoDB();
	const inspection = await resolveShareNonce({ nonce });
	if (!inspection) notFound();

	// Serialize the Mongoose document into the plain shape the client wrapper
	// reads. The wrapper renders read-only when given a shared inspection.
	const plain = JSON.parse(JSON.stringify(inspection));
	return (
		<InspectionWrapper id={String(plain._id)} sharedInspection={plain} />
	);
}
