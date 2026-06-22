/* eslint-disable no-console */
import mongoose from "mongoose";
import { connectMongoDB, disconnectMongoDB } from "../src/server/databases";
import {
	BrokerRequest,
	countDisputesDB,
	createBrokerRequestDB,
	createDisputeDB,
	createInspectionDB,
	createInspectionPhotoDB,
	createInspectorProfileDB,
	createUserDB,
	getUserByEmailDB,
	updateInspectionDB,
	updateInspectorProfileDB,
} from "../src/server/models";

interface SeedUserSpec {
	fullName: string;
	username: string;
	email: string;
	phone: string;
	role: "buyer" | "inspector" | "consultant" | "manager" | "admin";
	status?: "active" | "pending" | "approved" | "rejected" | "suspended";
	city?: string;
	onboardingCompleted?: boolean;
	permissions?: string[];
}

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "password123";

const USERS: SeedUserSpec[] = [
	{
		fullName: "Buyer One",
		username: "buyer1",
		email: "buyer@test.local",
		phone: "+2348010000001",
		role: "buyer",
		city: "Lagos",
		onboardingCompleted: true,
	},
	{
		fullName: "Buyer Two",
		username: "buyer2",
		email: "buyer2@test.local",
		phone: "+2348010000002",
		role: "buyer",
		city: "Abuja",
		onboardingCompleted: true,
	},
	{
		fullName: "Tunde Adebayo",
		username: "tunde",
		email: "inspector@test.local",
		phone: "+2348020000001",
		role: "inspector",
		status: "approved",
		city: "Lagos",
		onboardingCompleted: true,
	},
	{
		fullName: "Bashir Musa",
		username: "bashir",
		email: "inspector-pending@test.local",
		phone: "+2348020000002",
		role: "inspector",
		status: "pending",
		city: "Abuja",
		onboardingCompleted: true,
	},
	{
		fullName: "Fola Consultant",
		username: "fola",
		email: "consultant@test.local",
		phone: "+2348030000001",
		role: "consultant",
		status: "active",
		city: "Lagos",
		onboardingCompleted: true,
	},
	{
		fullName: "Admin Root",
		username: "admin",
		email: "admin@test.local",
		phone: "+2348040000001",
		role: "admin",
		status: "active",
		onboardingCompleted: true,
	},
	// Default-zero-access manager. The e2e suite uses this account to assert
	// the "no permissions = no access" invariant. Admin grants permissions
	// explicitly through the /admin/managers page.
	{
		fullName: "Manager Zero",
		username: "manager0",
		email: "manager@test.local",
		phone: "+2348050000001",
		role: "manager",
		status: "active",
		onboardingCompleted: true,
		permissions: [],
	},
];

async function ensureUser(spec: SeedUserSpec) {
	const existing = await getUserByEmailDB(spec.email);
	if (existing) return existing;
	console.log(`  + user ${spec.email} (${spec.role})`);
	return createUserDB({ ...spec, password: DEFAULT_PASSWORD });
}

async function main() {
	await connectMongoDB();
	console.log("[seed] mongo connected");

	console.log("[seed] users");
	const userByEmail: Record<
		string,
		Awaited<ReturnType<typeof ensureUser>>
	> = {};
	for (const u of USERS) {
		userByEmail[u.email] = await ensureUser(u);
	}

	const buyer = userByEmail["buyer@test.local"];
	const inspector = userByEmail["inspector@test.local"];
	const pendingInspector = userByEmail["inspector-pending@test.local"];
	if (!buyer || !inspector || !pendingInspector) {
		throw new Error("Seed users missing — ensureUser returned null");
	}

	console.log("[seed] inspector profiles");
	const inspectorProfile = await createInspectorProfileDB({
		userId: inspector._id,
		yearsExperience: 8,
		specialisations: ["Sedans", "SUVs", "Hybrids"],
		bio: "Eight years inspecting cars across Lagos. OBD2 certified.",
		rating: 4.9,
		totalCompleted: 184,
		availability: { toggleOn: true },
	}).catch((e: { code?: number }) => {
		if (e?.code === 11000) return null;
		throw e;
	});
	if (inspectorProfile) {
		await updateInspectorProfileDB(inspector._id.toString(), {
			rating: 4.9,
			totalCompleted: 184,
		});
	}

	await createInspectorProfileDB({
		userId: pendingInspector._id,
		yearsExperience: 5,
		specialisations: ["Sedans", "Trucks"],
		bio: "Five years experience in Abuja and surrounds.",
		availability: { toggleOn: false },
	}).catch((e: { code?: number }) => {
		if (e?.code === 11000) return null;
		throw e;
	});

	console.log("[seed] inspections");
	const now = new Date();
	const ago = (days: number) =>
		new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

	const active = await createInspectionDB({
		buyerId: buyer._id,
		inspectorId: inspector._id,
		assignedInspectorId: inspector._id,
		inspectionType: "premium",
		status: "in_progress",
		car: {
			make: "Toyota",
			model: "Camry",
			year: 2018,
			color: "Silver",
			sellerType: "dealership",
			city: "Lagos",
			address: "Lekki Phase 1, off Admiralty Way",
			sellerContact: "+2348059990001",
		},
		price: 52000,
		platformFee: 2500,
		scheduledFor: ago(0),
		slot: "11:00",
		currentSection: "Engine bay",
		assignedAt: ago(1),
		acceptedAt: ago(1),
		startedAt: ago(0),
	});

	console.log(`  + active inspection ${active._id} (Toyota Camry)`);

	const scheduled = await createInspectionDB({
		buyerId: buyer._id,
		assignedInspectorId: inspector._id,
		inspectionType: "standard",
		status: "scheduled",
		car: {
			make: "Honda",
			model: "Accord",
			year: 2020,
			color: "Pearl White",
			sellerType: "private",
			city: "Lagos",
			address: "Lekki Phase 1",
			sellerContact: "+2348059990002",
		},
		price: 32000,
		platformFee: 2500,
		scheduledFor: new Date(now.getTime() + 24 * 60 * 60 * 1000),
		slot: "11:00",
		assignedAt: ago(0),
	});
	console.log(`  + scheduled inspection ${scheduled._id} (Honda Accord)`);

	const completed = await createInspectionDB({
		buyerId: buyer._id,
		inspectorId: inspector._id,
		assignedInspectorId: inspector._id,
		inspectionType: "premium",
		status: "completed",
		car: {
			make: "Lexus",
			model: "RX 350",
			year: 2019,
			color: "Black",
			sellerType: "dealership",
			city: "Lagos",
			address: "Victoria Island",
		},
		price: 52000,
		platformFee: 2500,
		scheduledFor: ago(2),
		slot: "09:00",
		assignedAt: ago(3),
		acceptedAt: ago(3),
		startedAt: ago(2),
		completedPhysicalAt: ago(2),
		completedAt: ago(2),
		reportLockedAt: ago(2),
		report: {
			overview: {
				year: 2019,
				make: "Lexus",
				model: "RX 350",
				mileage: "62,400 km",
				transmission: "Automatic",
				vin: "JTJBARBZ1K2***123",
				engine: "3.5L V6",
				fuelType: "Petrol",
				bodyColor: "Black",
				interiorColor: "Beige",
				interiorType: "Leather",
				driveType: "AWD",
			},
			exterior: [
				{ label: "Body alignment", status: "good" },
				{ label: "Paint condition", status: "good" },
				{
					label: "Scratches",
					status: "minor",
					comment: "Light scratches on rear bumper",
				},
				{ label: "Tyres", status: "good" },
			],
			interior: [
				{ label: "Dashboard", status: "good" },
				{ label: "Seats and upholstery", status: "good" },
				{ label: "Air conditioning", status: "good" },
				{ label: "Infotainment", status: "good" },
			],
			mechanical: [
				{ label: "Engine condition", status: "good" },
				{ label: "Transmission", status: "good" },
				{ label: "Brakes", status: "good" },
				{ label: "Suspension", status: "good" },
			],
			roadTest: [
				{ label: "Engine performance", status: "good" },
				{ label: "Braking", status: "good" },
				{ label: "Steering", status: "good" },
			],
			verdict: "good",
			summary: {
				passed: 42,
				minor: 5,
				serious: 0,
				written:
					"Solid mechanical and structural condition. Minor cosmetic items only.",
				fixes: [
					{
						label: "Polish out rear-bumper scratches",
						priority: "Low",
					},
				],
			},
		},
	});
	await updateInspectionDB(completed._id.toString(), { photoCount: 32 });
	console.log(`  + completed inspection ${completed._id} (Lexus RX 350)`);

	const cautioned = await createInspectionDB({
		buyerId: buyer._id,
		inspectorId: inspector._id,
		assignedInspectorId: inspector._id,
		inspectionType: "standard",
		status: "completed",
		car: {
			make: "Mercedes",
			model: "C300",
			year: 2017,
			color: "Grey",
			sellerType: "private",
			city: "Lagos",
			address: "Ikeja GRA",
		},
		price: 32000,
		platformFee: 2500,
		scheduledFor: ago(7),
		slot: "14:00",
		assignedAt: ago(8),
		acceptedAt: ago(8),
		startedAt: ago(7),
		completedAt: ago(7),
		report: {
			overview: { year: 2017, make: "Mercedes", model: "C300" },
			exterior: [
				{ label: "Body alignment", status: "minor" },
				{ label: "Paint condition", status: "minor" },
			],
			interior: [{ label: "Dashboard", status: "good" }],
			mechanical: [
				{
					label: "Transmission",
					status: "serious",
					comment: "Slipping under load",
				},
			],
			roadTest: [{ label: "Braking", status: "good" }],
			verdict: "caution",
			summary: {
				passed: 28,
				minor: 6,
				serious: 1,
				written:
					"Drives reasonably but transmission needs imminent attention.",
				fixes: [{ label: "Transmission service", priority: "High" }],
			},
		},
	});
	await updateInspectionDB(cautioned._id.toString(), { photoCount: 28 });
	console.log(`  + completed inspection ${cautioned._id} (Mercedes C300)`);

	console.log("[seed] sample live photos for active inspection");
	const sections: Array<"exterior" | "interior" | "engine"> = [
		"exterior",
		"interior",
		"engine",
	];
	let seq = 0;
	for (let i = 0; i < 23; i++) {
		const section =
			sections[Math.min(Math.floor(i / 8), sections.length - 1)];
		seq += 1;
		await createInspectionPhotoDB({
			inspectionId: active._id,
			section,
			url: `mock://seed/${active._id}/${section}-${i + 1}.jpg`,
			sequence: seq,
			takenAt: new Date(now.getTime() - (23 - i) * 60_000),
		});
	}
	await updateInspectionDB(active._id.toString(), { photoCount: 23 });

	// ── Admin queue fixtures ─────────────────────────────────────────────
	// These populate the admin disputes / broker-requests / special-requests
	// queues so those pages render real rows and the e2e action endpoints
	// (resolve / assign) have stable targets. Idempotent: only created when
	// the respective collection has nothing relevant yet, so re-running the
	// seed locally doesn't pile up duplicates.

	console.log("[seed] special-request inspection");
	const specialRequest = await createInspectionDB({
		buyerId: buyer._id,
		inspectionType: "special_request",
		status: "submitted",
		car: {
			make: "Range Rover",
			model: "Sport",
			year: 2021,
			color: "Santorini Black",
			sellerType: "private",
			city: "Abuja",
			address: "Maitama, near the embassy district",
			sellerContact: "+2348059990010",
			notes: "Buyer wants a same-day turnaround and a compression test.",
		},
		price: 0,
		platformFee: 2500,
	});
	console.log(
		`  + special-request inspection ${specialRequest._id} (Range Rover Sport)`,
	);

	console.log("[seed] broker request");
	const existingBrokerForBuyer = await BrokerRequest.findOne({
		buyerId: buyer._id,
	}).exec();
	if (existingBrokerForBuyer) {
		console.log("  · broker request already present — skipping");
	} else {
		const brokerRequest = await createBrokerRequestDB({
			buyerId: buyer._id,
			inspectionId: completed._id,
			budget: 6_500_000,
			paymentMethod: "Bank transfer (escrow)",
			deliveryAddress: "12 Glover Road, Ikoyi, Lagos",
			instructions:
				"Negotiate hard — walk if they won't budge below ₦6.5M.",
			status: null,
		});
		console.log(`  + broker request ${brokerRequest._id} (unassigned)`);
	}

	console.log("[seed] dispute");
	const openDisputeCount = await countDisputesDB({ status: "open" });
	if (openDisputeCount > 0) {
		console.log(
			`  · ${openDisputeCount} open dispute(s) already present — skipping`,
		);
	} else {
		const dispute = await createDisputeDB({
			inspectionId: cautioned._id,
			raisedBy: buyer._id,
			statement:
				"The transmission was flagged 'serious' but the seller says it was serviced last month. Please review.",
			status: "open",
			resolution: null,
		});
		console.log(`  + open dispute ${dispute._id} (Mercedes C300)`);
	}

	console.log(
		`\n[seed] complete. Credentials (password = ${DEFAULT_PASSWORD}):`,
	);
	for (const u of USERS) {
		console.log(`  ${u.role.padEnd(10)} ${u.email}`);
	}

	await disconnectMongoDB();
	await mongoose.disconnect().catch(() => undefined);
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("[seed] failed:", err);
		process.exit(1);
	});
