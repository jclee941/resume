package main

import "testing"

func TestMigrationSequenceWarningsSortsMapKeys(t *testing.T) {
	warnings := migrationSequenceWarnings(map[int]string{
		7: "0007_create_wanted_application_history.sql",
		1: "0001_initial_schema.sql",
		2: "0002_add_applications.sql",
		3: "0003_add_sync_runs.sql",
		4: "0004_add_profile_tables.sql",
		5: "0005_add_auth_tables.sql",
		6: "0006_add_sessions.sql",
	})

	if len(warnings) != 0 {
		t.Fatalf("expected no sequence warnings, got %v", warnings)
	}
}

func TestMigrationSequenceWarningsReportsActualGap(t *testing.T) {
	warnings := migrationSequenceWarnings(map[int]string{
		1: "0001_initial_schema.sql",
		2: "0002_add_applications.sql",
		4: "0004_add_profile_tables.sql",
	})

	if len(warnings) != 1 {
		t.Fatalf("expected one sequence warning, got %v", warnings)
	}

	want := "⚠️  Gap in migration sequence: 2 → 4"
	if warnings[0] != want {
		t.Fatalf("expected %q, got %q", want, warnings[0])
	}
}
