export interface IEnv {
	NODE_ENV: string;
	NEXT_PUBLIC_API_URL: string;
	NEXT_PUBLIC_APP_URL: string;
	NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: string;
}

export type UserRole =
	| "buyer"
	| "inspector"
	| "consultant"
	| "admin"
	| "manager";

export type UserStatus =
	| "active"
	| "pending"
	| "approved"
	| "rejected"
	| "suspended";

export interface ISessionUser {
	id: string;
	fullName: string;
	username: string;
	email: string;
	phone?: string;
	role: UserRole;
	status: UserStatus;
	avatar?: string;
	city?: string;
	onboardingCompleted: boolean;
	permissions?: string[];
}

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

export interface IResponseEnvelope<T> {
	code: number;
	message?: string | null;
	data?: T | null;
}
