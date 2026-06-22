import "server-only";
import type { NextRequest } from "next/server";

export interface IParsedFile {
	fieldName: string;
	fileName: string;
	mimeType: string;
	buffer: Buffer;
}

export interface IParsedMultipart {
	fields: Record<string, string>;
	files: IParsedFile[];
}

export async function parseMultipart(
	req: NextRequest,
): Promise<IParsedMultipart> {
	const contentType = req.headers.get("content-type") || "";
	if (!contentType.includes("multipart/form-data")) {
		const text = await req.text();
		try {
			const j = JSON.parse(text);
			return { fields: j as Record<string, string>, files: [] };
		} catch {
			return { fields: {}, files: [] };
		}
	}
	const formData = await req.formData();
	const fields: Record<string, string> = {};
	const files: IParsedFile[] = [];
	for (const [k, v] of formData.entries()) {
		if (v instanceof File) {
			const buf = Buffer.from(await v.arrayBuffer());
			files.push({
				fieldName: k,
				fileName: v.name,
				mimeType: v.type,
				buffer: buf,
			});
		} else {
			fields[k] = String(v);
		}
	}
	return { fields, files };
}

export function singleFileBuffer(
	parsed: IParsedMultipart,
	fieldName: string,
): IParsedFile | null {
	return parsed.files.find((f) => f.fieldName === fieldName) ?? null;
}
