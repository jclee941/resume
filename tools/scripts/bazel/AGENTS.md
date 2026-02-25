# BAZEL FACADE SCRIPTS KNOWLEDGE BASE

## OVERVIEW

Shell wrappers in this directory provide Bazel-oriented entrypoints for build/test/deploy validation tasks while day-to-day workflows remain npm-first.

## STRUCTURE

```text
bazel/
├── BUILD.bazel                # Bazel package definition
├── build.sh                   # facade build wrapper
├── build_portfolio.sh         # portfolio build wrapper
├── build_job_automation.sh    # job-automation build wrapper
├── test.sh                    # facade test wrapper
├── test_job_automation.sh     # job-automation test wrapper
├── validate_data.sh           # data validation wrapper
├── deploy.sh                  # facade deploy wrapper
├── deploy_portfolio.sh        # portfolio deploy wrapper
└── deploy_job_automation.sh   # job-automation deploy wrapper
```

## CONVENTIONS

- Keep wrappers thin; delegate real logic to underlying scripts/commands.
- Preserve predictable script names for CI and Bazel targets.
- Keep shell scripts idempotent and strict-mode compatible.
- Maintain parity with repo-level deployment/verification policy.

## ANTI-PATTERNS

- Do not add product logic that belongs in TypeScript runtime modules.
- Do not bypass validation steps in wrapper shortcuts.
- Do not hardcode machine-local paths in Bazel facade scripts.
- Do not introduce wrapper divergence from canonical npm workflows.
