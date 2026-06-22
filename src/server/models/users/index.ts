import "server-only";
import bcrypt from "bcrypt";
import mongoose, { type Document, Schema } from "mongoose";
import {
	databaseResponseTimeHistogram,
	IOperationType,
} from "@/server/metrics";
import type { UserRole } from "@/server/types";

export type UserStatus =
	| "active"
	| "pending"
	| "approved"
	| "rejected"
	| "suspended";

export interface IUser extends Document {
	_id: mongoose.Types.ObjectId;
	fullName: string;
	username: string;
	email: string;
	phone?: string;
	password: string;
	role: UserRole;
	status: UserStatus;
	avatar?: string;
	onboardingCompleted: boolean;
	city?: string;
	// Granular permissions for the `manager` role. Empty array (= default) means
	// the manager has zero access. Ignored for every other role.
	permissions: string[];
	// Invite handshake (currently used by the `manager` role only). When an
	// admin creates a manager we mint a single-use token and put the user in
	// `pending`. The manager accepts via /invite/<token> which sets their own
	// password and flips status to `active`.
	inviteToken?: string;
	invitedAt?: Date;
	inviteTokenExpiresAt?: Date;
	inviteAcceptedAt?: Date;
	inviteRejectedAt?: Date;
	deleted: boolean;
	createdAt: Date;
	updatedAt: Date;
	comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
	{
		fullName: { type: String, required: true, trim: true },
		username: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
			index: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
			index: true,
		},
		phone: { type: String, trim: true },
		// Password is optional in the model so that a manager can be created
		// in `pending` state without a credential — they set it themselves on
		// invite acceptance. Existing roles still go through createUser, which
		// requires a password and exercises the pre-save hash hook.
		password: { type: String, select: false },
		role: {
			type: String,
			enum: ["buyer", "inspector", "consultant", "manager", "admin"],
			default: "buyer",
			index: true,
		},
		status: {
			type: String,
			enum: ["active", "pending", "approved", "rejected", "suspended"],
			default: "active",
			index: true,
		},
		avatar: { type: String },
		onboardingCompleted: { type: Boolean, default: false },
		city: { type: String, trim: true },
		permissions: { type: [String], default: [] },
		// Sparse unique so multiple users can have NO token, but every token
		// is unique while it exists. Cleared on accept/reject (single use).
		inviteToken: { type: String, index: true, sparse: true, unique: true },
		invitedAt: { type: Date },
		inviteTokenExpiresAt: { type: Date },
		inviteAcceptedAt: { type: Date },
		inviteRejectedAt: { type: Date },
		deleted: { type: Boolean, default: false, select: false },
	},
	{ timestamps: true },
);

// Hash password before save. Mongoose's overload for pre("save") in this
// version trips TS overload resolution unless we cast the hook.
userSchema.pre("save", async function (this: IUser) {
	if (!this.isModified("password")) return;
	this.password = await bcrypt.hash(this.password, 12);
} as never);

userSchema.methods.comparePassword = async function (
	candidate: string,
): Promise<boolean> {
	return bcrypt.compare(candidate, this.password);
};

const COLLECTION = "users";
export const User =
	(mongoose.models[COLLECTION] as mongoose.Model<IUser>) ||
	mongoose.model<IUser>(COLLECTION, userSchema);

function timer(method: string) {
	return databaseResponseTimeHistogram.startTimer({
		operation: IOperationType.Read,
		collection: COLLECTION,
		method,
	});
}

export async function createUserDB(payload: Partial<IUser>): Promise<IUser> {
	const stop = timer("createUserDB");
	try {
		const u = await User.create(payload);
		stop({ success: "true" });
		return u;
	} catch (e) {
		stop({ success: "false" });
		throw e;
	}
}

export async function getUserByEmailWithPasswordDB(
	email: string,
): Promise<IUser | null> {
	const stop = timer("getUserByEmailWithPasswordDB");
	const u = await User.findOne({ email: email.toLowerCase(), deleted: false })
		.select("+password")
		.exec();
	stop({ success: "true" });
	return u;
}

export async function getUserByEmailDB(email: string): Promise<IUser | null> {
	const stop = timer("getUserByEmailDB");
	const u = await User.findOne({
		email: email.toLowerCase(),
		deleted: false,
	}).exec();
	stop({ success: "true" });
	return u;
}

export async function getUserByIdDB(id: string): Promise<IUser | null> {
	const stop = timer("getUserByIdDB");
	if (!mongoose.isValidObjectId(id)) {
		stop({ success: "false" });
		return null;
	}
	const u = await User.findOne({ _id: id, deleted: false }).exec();
	stop({ success: "true" });
	return u;
}

export async function getUserByUsernameDB(
	username: string,
): Promise<IUser | null> {
	const stop = timer("getUserByUsernameDB");
	const u = await User.findOne({
		username: username.toLowerCase(),
		deleted: false,
	}).exec();
	stop({ success: "true" });
	return u;
}

export async function getUserByInviteTokenDB(
	token: string,
): Promise<IUser | null> {
	const stop = timer("getUserByInviteTokenDB");
	const u = await User.findOne({ inviteToken: token, deleted: false }).exec();
	stop({ success: "true" });
	return u;
}

export async function updateUserDB(
	id: string,
	patch: Partial<IUser>,
): Promise<IUser | null> {
	const stop = timer("updateUserDB");
	const u = await User.findOneAndUpdate(
		{ _id: id, deleted: false },
		{ $set: patch },
		{ new: true },
	).exec();
	stop({ success: "true" });
	return u;
}

export async function changePasswordDB(
	id: string,
	newPassword: string,
): Promise<boolean> {
	const stop = timer("changePasswordDB");
	const user = await User.findById(id).exec();
	if (!user) {
		stop({ success: "false" });
		return false;
	}
	user.password = newPassword;
	await user.save();
	stop({ success: "true" });
	return true;
}

export async function listUsersByRoleDB(
	role: UserRole,
	filter: Partial<IUser> = {},
	limit = 50,
	offset = 0,
): Promise<IUser[]> {
	const stop = timer("listUsersByRoleDB");
	const items = await User.find({ role, deleted: false, ...filter })
		.sort({ createdAt: -1 })
		.skip(offset)
		.limit(limit)
		.exec();
	stop({ success: "true" });
	return items;
}

export async function countUsersByRoleDB(
	role: UserRole,
	filter: Partial<IUser> = {},
): Promise<number> {
	const stop = timer("countUsersByRoleDB");
	const n = await User.countDocuments({ role, deleted: false, ...filter });
	stop({ success: "true" });
	return n;
}
