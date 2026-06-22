import { AppError } from "./errorMessages";

export * from "./errorMessages";

/**
 * Maps any thrown error to a `{ code, message }` pair used by `handleError()`
 * in the response helpers.
 */
export function getErrorResponse(
	error: unknown,
): { code: number; message: string } | null {
	if (error instanceof AppError) {
		return { code: error.code, message: error.message };
	}

	// Mongoose duplicate key error (E11000)
	if (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code: unknown }).code === 11000
	) {
		const err = error as { keyValue?: Record<string, unknown> };
		const field = err.keyValue ? Object.keys(err.keyValue)[0] : "field";
		return {
			code: 409,
			message: `An account with this ${field} already exists`,
		};
	}

	return null;
}
