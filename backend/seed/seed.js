/**
 * Seeds the database with a rich, presentation-ready demo dataset spanning
 * three municipalities, several syndicates each, dozens of riders and
 * bikes in varied compliance states, and a realistic enforcement history
 * (verifications + incidents) spread across the last 30 days so every
 * dashboard chart and table has something meaningful to show.
 *
 * Run with: npm run seed
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");

const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Syndicate = require("../models/Syndicate");
const Rider = require("../models/Rider");
const Bike = require("../models/Bike");
const EnforcementLog = require("../models/EnforcementLog");

const FIRST_NAMES = [
  "Enow",
  "Ashu",
  "Divine",
  "Mola",
  "Agbor",
  "Tabe",
  "Ngala",
  "Ekema",
  "Fon",
  "Besong",
  "Ndifor",
  "Ngole",
  "Achu",
  "Egbe",
  "Orock",
  "Manga",
  "Eyongwan",
  "Mbua",
  "Bate",
  "Nkemla",
];
const LAST_NAMES = [
  "Peter",
  "Collins",
  "Junior",
  "Etonde",
  "Divine",
  "Njie",
  "Godlove",
  "Ebot",
  "Arrey",
  "Tanyi",
  "Mokeba",
  "Ayamba",
  "Esambe",
  "Njoh",
  "Ekane",
];
const BIKE_MAKES = [
  ["Bajaj", "Boxer"],
  ["Haojue", "HJ125"],
  ["TVS", "StaR"],
  ["Sanili", "SL125"],
  ["Boxer", "BM150"],
];
const COLORS = ["Red", "Blue", "Black", "Yellow", "Green", "Grey"];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const run = async () => {
  await connectDB();
  console.log("[seed] Clearing existing collections...");
  await Promise.all([
    Tenant.deleteMany({}),
    User.deleteMany({}),
    Syndicate.deleteMany({}),
    Rider.deleteMany({}),
    Bike.deleteMany({}),
    EnforcementLog.deleteMany({}),
  ]);

  console.log("[seed] Creating super admin...");
  const superAdmin = new User({
    fullName: "MotoSecure Platform Admin",
    email: process.env.SEED_SUPERADMIN_EMAIL || "admin@motosecure.cm",
    role: "super_admin",
  });
  await superAdmin.setPassword(
    process.env.SEED_SUPERADMIN_PASSWORD || "ChangeMe123!",
  );
  await superAdmin.save();

  const councilDefs = [
    {
      name: "Buea Municipal Council",
      slug: "buea",
      region: "South West",
      mayorName: "Hon. Patrick Ekema",
      contactEmail: "council@buea.cm",
      status: "active",
      plan: "premium",
      syndicates: [
        { name: "Molyko Riders Union", zone: "Molyko" },
        { name: "Great Soppo Bendskin Union", zone: "Great Soppo" },
        { name: "Mile 17 Motor Taxi Cooperative", zone: "Mile 17" },
      ],
    },
    {
      name: "Douala V Municipal Council",
      slug: "douala-v",
      region: "Littoral",
      mayorName: "Hon. Jeanne Manga",
      contactEmail: "council@douala5.cm",
      status: "active",
      plan: "standard",
      syndicates: [
        { name: "Ndogbong Okada Union", zone: "Ndogbong" },
        { name: "Kotto Riders Syndicate", zone: "Kotto" },
      ],
    },
    {
      name: "Bamenda III Council",
      slug: "bamenda-iii",
      region: "North West",
      mayorName: "Hon. Fon Achu",
      contactEmail: "council@bamenda3.cm",
      status: "pending",
      plan: "trial",
      syndicates: [{ name: "Nkwen Commercial Bike Union", zone: "Nkwen" }],
    },
  ];

  const demoCredentials = [
    `  super_admin                    admin@motosecure.cm / (see .env SEED_SUPERADMIN_PASSWORD)`,
  ];

  let totalRiders = 0;
  let totalIncidents = 0;

  for (const def of councilDefs) {
    console.log(`[seed] Creating tenant: ${def.name}...`);
    const tenant = await Tenant.create({
      name: def.name,
      slug: def.slug,
      region: def.region,
      mayorName: def.mayorName,
      contactEmail: def.contactEmail,
      status: def.status,
      plan: def.plan,
    });

    const slugKey = def.slug.replace(/-/g, "");

    const mayorEmail = `mayor@${slugKey}.cm`;
    const mayor = new User({
      tenant: tenant._id,
      fullName: def.mayorName,
      email: mayorEmail,
      role: "mayor",
    });
    await mayor.setPassword("Mayor123!");
    await mayor.save();
    demoCredentials.push(
      `  mayor (${def.slug})              ${mayorEmail} / Mayor123!`,
    );

    const officerEmail = `officer@${slugKey}.cm`;
    const officer = new User({
      tenant: tenant._id,
      fullName: `Officer ${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
      email: officerEmail,
      role: "enforcement_officer",
      badgeNumber: `ENF-${randInt(1000, 9999)}`,
    });
    await officer.setPassword("Officer123!");
    await officer.save();
    demoCredentials.push(
      `  enforcement_officer (${def.slug}) ${officerEmail} / Officer123!`,
    );

    for (const [sIndex, sDef] of def.syndicates.entries()) {
      const status =
        sIndex === def.syndicates.length - 1 && def.syndicates.length > 1
          ? "pending"
          : "approved";
      const syndicate = await Syndicate.create({
        tenant: tenant._id,
        name: sDef.name,
        zone: sDef.zone,
        presidentName: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
        presidentPhone: `+2376${randInt(70000000, 79999999)}`,
        contactEmail: `${sDef.zone.toLowerCase().replace(/\s+/g, "")}@syndicate.cm`,
        status,
        memberCount: 0,
        trustScore: randInt(55, 95),
      });

      if (sIndex === 0) {
        const syndicateAdminEmail = `syndicate@${slugKey}.cm`;
        const syndicateAdmin = new User({
          tenant: tenant._id,
          syndicate: syndicate._id,
          fullName: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
          email: syndicateAdminEmail,
          role: "syndicate_admin",
        });
        await syndicateAdmin.setPassword("Syndicate123!");
        await syndicateAdmin.save();
        demoCredentials.push(
          `  syndicate_admin (${def.slug})    ${syndicateAdminEmail} / Syndicate123!`,
        );
      }

      const riderCount = status === "approved" ? randInt(6, 10) : randInt(1, 3);
      let syndicateMemberCount = 0;

      for (let i = 0; i < riderCount; i++) {
        const statusRoll = Math.random();
        const riderStatus =
          statusRoll < 0.75
            ? "active"
            : statusRoll < 0.88
              ? "under_review"
              : statusRoll < 0.96
                ? "suspended"
                : "revoked";

        const licenseExpiresAt =
          riderStatus === "revoked"
            ? daysAgo(randInt(30, 200))
            : Math.random() < 0.1
              ? daysAgo(randInt(1, 20)) // a few expired licenses for realism
              : new Date(Date.now() + randInt(30, 300) * 24 * 60 * 60 * 1000);

        const rider = await Rider.create({
          tenant: tenant._id,
          syndicate: syndicate._id,
          fullName: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
          phone: `+2376${randInt(70000000, 79999999)}`,
          status: riderStatus,
          licenseNumber: `LIC-${randInt(1000, 9999)}`,
          licenseExpiresAt,
          verificationCount: randInt(0, 40),
          incidentCount: 0,
          joinedAt: daysAgo(randInt(10, 400)),
        });

        const [make, model] = rand(BIKE_MAKES);
        const regionCode =
          def.region === "South West"
            ? "SW"
            : def.region === "Littoral"
              ? "LT"
              : "NW";
        const bike = await Bike.create({
          tenant: tenant._id,
          syndicate: syndicate._id,
          rider: rider._id,
          plateNumber: `${regionCode} ${randInt(100, 999)} ${String.fromCharCode(65 + randInt(0, 25))}${String.fromCharCode(
            65 + randInt(0, 25),
          )}`,
          make,
          model,
          color: rand(COLORS),
          yearOfManufacture: randInt(2017, 2024),
          insuranceProvider: rand([
            "Activa Insurance",
            "Chanas Assurances",
            "Saar Assurances",
            "Prudential BSN",
          ]),
          insuranceExpiresAt: new Date(
            Date.now() + randInt(-15, 200) * 24 * 60 * 60 * 1000,
          ),
          roadworthy: Math.random() > 0.12,
          status: "active",
        });

        rider.bike = bike._id;
        await rider.save();
        syndicateMemberCount += 1;
        totalRiders += 1;

        // Spread a realistic run of verification logs over the last 30 days
        const verificationEvents = randInt(1, 5);
        for (let v = 0; v < verificationEvents; v++) {
          let result = "valid";
          if (riderStatus === "suspended") result = "suspended";
          else if (riderStatus === "revoked" || riderStatus === "under_review")
            result = "flagged";
          else if (licenseExpiresAt < new Date()) result = "expired";

          await EnforcementLog.create({
            tenant: tenant._id,
            rider: rider._id,
            bike: bike._id,
            officer: officer._id,
            type: "verification",
            result,
            location: {
              label: `${sDef.zone} checkpoint`,
              lat: 4.1 + Math.random() * 0.3,
              lng: 9.2 + Math.random() * 0.3,
            },
            createdAt: daysAgo(randInt(0, 29)),
          });
        }

        // A minority of riders have a real incident on file
        if (Math.random() < 0.12) {
          const severity = rand(["low", "medium", "high", "critical"]);
          const descriptions = [
            "Reported reckless driving near the market roundabout.",
            "Passenger complaint: overcharging on a short trip.",
            "Bike found without a valid helmet for passenger.",
            "Involved in a minor collision with a taxi.",
            "Operating outside registered zone without notice.",
          ];
          await EnforcementLog.create({
            tenant: tenant._id,
            rider: rider._id,
            bike: bike._id,
            officer: officer._id,
            type: "incident",
            result: "flagged",
            severity,
            description: rand(descriptions),
            location: {
              label: `${sDef.zone} area`,
              lat: 4.1 + Math.random() * 0.3,
              lng: 9.2 + Math.random() * 0.3,
            },
            createdAt: daysAgo(randInt(0, 29)),
          });
          rider.incidentCount += 1;
          await rider.save();
          totalIncidents += 1;
        }
      }

      syndicate.memberCount = syndicateMemberCount;
      await syndicate.save();
    }
  }

  console.log(
    `\n[seed] Done! Seeded ${totalRiders} riders and ${totalIncidents} incidents across ${councilDefs.length} municipalities.`,
  );
  console.log("\n[seed] Demo accounts:");
  demoCredentials.forEach((line) => console.log(line));
  console.log(
    "\n[seed] Tenant slugs (for the syndicate enrollment portal): buea, douala-v, bamenda-iii",
  );
  console.log(
    "[seed] Primary demo tenant for the pitch: buea (fully populated, premium plan, active)",
  );

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
