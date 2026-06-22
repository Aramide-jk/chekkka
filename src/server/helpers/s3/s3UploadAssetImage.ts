import "server-only";
import crypto from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { S3_BUCKET } from "../../constants";
import getS3Instance from "./getS3Instance";

/**
 * Upload a buffer to S3 (when credentials are present) or generate a
 * deterministic mock key when running locally without S3.
 *
 * The object key is **content-addressed**: `<basePath>/<sha256(bytes)>.<ext>`.
 * Identical bytes always produce the same key, so re-uploading the same file —
 * across retries, double-submits, or separate requests — overwrites the
 * existing object instead of saving a duplicate under a fresh UUID. (S3 PUT is
 * idempotent for a given key.)
 *
 * Returns the stored S3 **key** (e.g. `inspections/<id>/photos/<hash>.jpeg`),
 * not a public URL. Persist the key and resolve it to a viewer-ready URL on
 * read via {@link s3GetFileLink} — that way the asset URL is always a fresh
 * presigned link rather than a stale/public one baked into the document.
 */
export default async function uploadAndResizeImage({
	basePath,
	buffer,
	mimeType,
}: {
	basePath: string;
	buffer: Buffer;
	mimeType: string;
}): Promise<string> {
	// `image/svg+xml` → `svg`; `application/pdf` → `pdf`; fall back to `bin`.
	const ext = (mimeType.split("/")[1] || "bin").split("+")[0] || "bin";
	const hash = crypto.createHash("sha256").update(buffer).digest("hex");
	const key = `${basePath}/${hash}.${ext}`;
	const client = getS3Instance();
	if (client) {
		await client.send(
			new PutObjectCommand({
				Bucket: S3_BUCKET,
				Key: key,
				Body: buffer,
				ContentType: mimeType,
			}),
		);
		return key;
	}
	// Local mock — no S3 configured. The key is resolved to an in-app proxy URL
	// by s3GetFileLink so the rest of the pipeline behaves identically.
	return `mock://${key}`;
}
