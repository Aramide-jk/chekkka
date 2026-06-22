/**
 * Singleton error instances used throughout the server.
 * Every error has a stable `code` (HTTP status) and `message` consumed by
 * `getErrorResponse()` in ./index.ts.
 */
export class AppError extends Error {
	code: number;
	constructor(code: number, message: string) {
		super(message);
		this.code = code;
		this.name = "AppError";
	}
}

// 400 — Bad request
export const ErrInvalidFields = new AppError(400, "Invalid fields provided");
export const ErrInvalidAction = new AppError(400, "Invalid action");
export const ErrInvalidEmail = new AppError(400, "Invalid email");
export const ErrInvalidPassword = new AppError(400, "Invalid password");
export const ErrInvalidOTP = new AppError(400, "Invalid or expired OTP");
export const ErrInvalidPhone = new AppError(400, "Invalid phone number");
export const ErrPasswordsMismatch = new AppError(400, "Passwords do not match");
export const ErrReportLocked = new AppError(
	400,
	"This report is locked and can no longer be edited",
);

// 401 — Unauthenticated
export const ErrUnauthenticated = new AppError(401, "Unauthenticated");
export const ErrInvalidCredentials = new AppError(401, "Invalid credentials");
export const ErrInvalidAuthToken = new AppError(
	401,
	"Invalid or expired authentication token",
);

// 403 — Forbidden
export const ErrForbidden = new AppError(403, "Forbidden");
export const ErrInspectorNotApproved = new AppError(
	403,
	"Your inspector application is not yet approved",
);
export const ErrAccountSuspended = new AppError(
	403,
	"This account is suspended",
);

// 404 — Not found
export const ErrNotFound = new AppError(404, "Resource not found");
export const ErrUserNotFound = new AppError(404, "User not found");
export const ErrInspectionNotFound = new AppError(404, "Inspection not found");
export const ErrChatNotFound = new AppError(404, "Chat not found");

// 409 — Conflict
export const ErrEmailAlreadyExists = new AppError(
	409,
	"An account with this email already exists",
);
export const ErrUsernameAlreadyExists = new AppError(
	409,
	"This username is taken",
);

// 429 — Too many
export const ErrTooManyRequests = new AppError(
	429,
	"Too many requests, please try again later",
);

// 500 — Internal
export const ErrInternalServer = new AppError(500, "Internal Server Error");
