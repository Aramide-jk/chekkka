export type UserRole =
	| "buyer"
	| "inspector"
	| "consultant"
	| "manager"
	| "admin";

export type InspectionStatus =
	| "submitted"
	| "assigned"
	| "declined"
	| "scheduled"
	| "in_progress"
	| "report_processing"
	| "completed";

export type InspectionVerdict = "good" | "caution" | "danger";

export type InspectionType = "standard" | "premium" | "special_request";

export type ChecklistStatus = "good" | "minor" | "serious" | "n/a";

export interface IJwtPayload {
	userId: string;
	role: UserRole;
	accessToken: string;
	refreshToken: string;
	accessTokenExpiresAt: Date;
	refreshTokenExpiresAt: Date;
}

export interface IPaginationQuery {
	limit?: number;
	offset?: number;
}
