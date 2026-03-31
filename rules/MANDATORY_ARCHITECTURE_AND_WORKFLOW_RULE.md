<MANDATORY_ARCHITECTURE_AND_WORKFLOW_RULE severity="BLOCKING" priority="HIGHEST">
Modular Code Architecture & Workflow — Zero Tolerance Policy

This rule is NON-NEGOTIABLE. Violations BLOCK all further work until resolved.

[COMMUNICATION DIRECTIVE]
Language Requirement: You MUST respond to the user in Korean (한국어). All explanations, code reviews, answers, and dialogue must be provided in Korean, regardless of the language used in the user's prompt.

[EXECUTION POSTURE]
Zero-Questions Policy: Never ask for confirmation, preferences, or permissions. Infer context from code/config, choose safest reversible interpretation, and proceed immediately. Report assumptions after execution with evidence.

[ARCHITECTURE & WORKFLOW RULES]

Rule 1: Entry Points are Corridors, Not Dumping Grounds
Entry point files (e.g., `index`, `main`, `__init__`, `app`) MUST ONLY contain:
- Re-exports and imports
- Factory function calls that compose modules
- Top-level wiring/registration (router setup, plugin registration, dependency injection)

Entry points MUST NEVER contain:
- Business logic implementation
- Helper/utility functions
- Complex type/class definitions beyond simple references
- Multiple unrelated responsibilities mixed together

If you find mixed logic in an entry point: Extract each responsibility into its own dedicated file BEFORE making any other changes. This is not optional.

Rule 2: No Catch-All Files — `utils` / `common` are CODE SMELLS
A single `utils`, `helpers`, `common`, or `services` file is a gravity well — every unrelated function gets tossed in, and it grows into an untestable, unreviewable blob.

These file names are BANNED as top-level catch-alls. Instead:
- Anti-Pattern: `utils` handling date formatting, slugification, and retries.
- Refactor To: `date_formatter`, `slugify`, `retry_handler`
- Anti-Pattern: `service` handling auth + billing + notifications.
- Refactor To: `auth_service`, `billing_service`, `notification_service`

Design for reusability from the start. Each module should be independently importable, self-contained, and nameable by its exact purpose.

Rule 3: Single Responsibility Principle — ABSOLUTE
Every source code file MUST have exactly ONE clear, nameable responsibility.
Self-test: If you cannot describe the file's purpose in ONE short phrase (e.g., "parses YAML frontmatter", "handles user authentication"), the file does too much. Split it.

- Signal: File has 2+ unrelated public functions/classes -> Action: SPLIT NOW
- Signal: File mixes I/O (Network/DB) with pure business logic -> Action: SPLIT NOW 
- Signal: You need to scroll extensively to understand the file -> Action: SPLIT NOW

Rule 4: 200 LOC Hard Limit — CODE SMELL DETECTOR
Any source code file exceeding 200 lines of code (excluding long string prompts, SQL queries, or markdown content) is an immediate code smell.

When you detect a file > 200 LOC:
1. STOP current work.
2. Identify the multiple responsibilities hiding in the file.
3. Extract each responsibility into a focused module.
4. Verify each resulting file is < 200 LOC and has a single purpose.
5. Resume original work.

Quick method: Read the file -> subtract blank lines, comment-only lines, and long static string content -> remaining count = LOC. When in doubt, round up — err on the side of splitting.

Thresholds Reference:
- > 500 LOC: Must split before merging new functionality (HARD)
- > 300 LOC: Must split if adding new logic (HARD)
- > 200 LOC: Assess if natural split points exist (SOFT - this project uses as HARD)

Rule 5: ALL Automation Workflows MUST be Handled by n8n
Do NOT write custom code, standalone scripts, or cron jobs for automation, scheduled tasks, webhooks, or API orchestrations. 
- n8n is the SINGLE source of truth for all automation workflows.
- If a task involves triggering an action on a schedule, connecting multiple third-party APIs, or automating a sequential business process, it MUST be built as a node-based workflow in n8n.
- Your code should only expose modular APIs, Webhooks, or individual functions that n8n can consume and orchestrate. Do not hardcode the orchestration logic in the application codebase.

[NAMING CONVENTIONS]

Directory Names (kebab-case): `^[a-z0-9][a-z0-9-]*$`
- Good: `job-server`, `resume-data`, `auth-service`
- Bad: `jobServer`, `resume_data`, `AuthService`

File Names (lowercase with dots/hyphens): `^[a-z0-9][a-z0-9.-]*$`
- Good: `resume-parser.ts`, `date-formatter.js`, `auth-middleware.go`
- Bad: `ResumeParser.ts`, `dateFormatter.js`, `AuthMiddleware.go`

Operational Scripts: Go (`.go`) by default, Node (`.mjs`) only for hooks/linters.
- Good: `deploy.go`, `sync-resume.go`
- Bad: `deploy.sh`, `sync-resume.js`

[DEPENDENCY DIRECTION]
Handlers → Services → Repositories → Clients (downward only).
Types and Utils may be imported by any layer (sideways/upward).
Never reverse the direction.

[VERIFICATION CHECKLIST]

When splitting files, verify:
1. All output files below 200 LOC (this project) or 500 LOC (general)
2. No circular dependencies introduced
3. All existing tests pass
4. Build/typecheck succeeds
5. No new lint errors
6. All external imports updated
7. File names follow naming convention

[HOW TO APPLY]

When reading, writing, or editing ANY codebase:
1. Check the code you're touching — does it violate any rule above?
2. If YES — refactor FIRST, then proceed with your task.
3. If creating a new file — ensure it has exactly one responsibility and stays under 200 LOC.
4. If building an automation/scheduled task — halt coding and move the orchestration logic to n8n immediately.
5. If renaming/moving files — update all direct references in docs/config/scripts.

[ANTI-PATTERNS]

- Premature splitting: Splitting <200 LOC files or during prototyping.
- Shotgun splitting: Every function in its own file regardless of cohesion.
- False modularity: Split files still share state via globals or circular deps.
- Over-abstraction: Abstract base classes or DI frameworks just to justify a split.
- Catch-all names: `helpers.ts`, `utils.ts`, `misc.ts` as dumps.

[BLOCKED-STEP POLICY]

For destructive or irreversible operations (delete data, force push, billing/security posture change):
- Skip the risky step, run all safe alternatives, and report exact skipped action with reason.
- Provide rollback path and exact next command to unblock.
</MANDATORY_ARCHITECTURE_AND_WORKFLOW_RULE>
