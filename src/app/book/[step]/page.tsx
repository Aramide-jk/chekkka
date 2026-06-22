import { notFound } from "next/navigation";
import BookingWrapper from "@/libs/BookingWrapper";

export const metadata = { title: "Book inspection · Chekka" };

const VALID_STEPS = new Set(["1", "2", "3", "4", "5"]);

export default async function BookStepPage({
	params,
}: {
	params: Promise<{ step: string }>;
}) {
	const { step } = await params;
	if (!VALID_STEPS.has(step)) notFound();
	return <BookingWrapper step={step} />;
}
