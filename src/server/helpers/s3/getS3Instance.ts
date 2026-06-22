import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import {
	S3_ACCESS_KEY,
	S3_BUCKET,
	S3_REGION,
	S3_SECRET_ACCESS_KEY,
} from "../../constants";

let _s3: S3Client | null = null;

/**
 * Returns a singleton {@link S3Client}, or `null` when S3 credentials are
 * absent (local dev without S3 — callers fall back to the mock pathway).
 */
export default function getS3Instance(): S3Client | null {
	if (!S3_BUCKET || !S3_ACCESS_KEY || !S3_SECRET_ACCESS_KEY) return null;
	if (_s3) return _s3;
	_s3 = new S3Client({
		region: S3_REGION || "us-east-1",
		credentials: {
			accessKeyId: S3_ACCESS_KEY,
			secretAccessKey: S3_SECRET_ACCESS_KEY,
		},
	});
	return _s3;
}
