const fs = require("fs");
const path = require("path");
const { homedir } = require("os");

const OLD_DATA_DIR = path.join(homedir(), ".claude", "data");
const APPLICATIONS_FILE = path.join(OLD_DATA_DIR, "job-applications.json");

async function migrate() {
  console.log("=== JSON to D1 Migration ===\n");

  if (!fs.existsSync(APPLICATIONS_FILE)) {
    console.log("No existing applications.json found. Starting fresh.");
    return;
  }

  const data = JSON.parse(fs.readFileSync(APPLICATIONS_FILE, "utf-8"));
  const applications = Object.values(data.applications || {});
  console.log(`Found ${applications.length} applications to migrate.\n`);

  const insertStatements = [];
  const timelineStatements = [];

  for (const app of applications) {
    const values = [
      app.id,
      app.jobId || null,
      app.source || "manual",
      app.sourceUrl || null,
      app.position || "Unknown",
      app.company || "Unknown",
      app.location || null,
      app.matchScore || 0,
      app.status || "pending",
      app.priority || "medium",
      app.resumeId || null,
      app.coverLetter || null,
      app.notes || "",
      app.createdAt,
      app.updatedAt,
      app.appliedAt || null,
    ].map((v) => (v === null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`));

    insertStatements.push(
      `INSERT OR IGNORE INTO applications (id, job_id, source, source_url, position, company, location, match_score, status, priority, resume_id, cover_letter, notes, created_at, updated_at, applied_at) VALUES (${values.join(", ")});`,
    );

    if (app.timeline) {
      for (const event of app.timeline) {
        const timelineValues = [
          app.id,
          event.status,
          event.previousStatus || null,
          event.note || "",
          event.timestamp,
        ].map((v) =>
          v === null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`,
        );

        timelineStatements.push(
          `INSERT INTO application_timeline (application_id, status, previous_status, note, timestamp) VALUES (${timelineValues.join(", ")});`,
        );
      }
    }
  }

  const migrationSQL = [
    "-- Migration from applications.json",
    `-- Generated: ${new Date().toISOString()}`,
    `-- Applications: ${applications.length}`,
    "",
    ...insertStatements,
    "",
    "-- Timeline events",
    ...timelineStatements,
  ].join("\n");

  const outputPath = path.join(__dirname, "migration-data.sql");
  fs.writeFileSync(outputPath, migrationSQL);

  console.log(`Migration SQL written to: ${outputPath}`);
  console.log(`\nTo apply migration:`);
  console.log(
    `  npx wrangler d1 execute job-dashboard-db --file=migration-data.sql`,
  );
}

migrate().catch(console.error);
