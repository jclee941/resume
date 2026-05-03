# Automation verification

This file is created solely to verify that:

1. The standard PR validation workflow (`pr-checks.yml`) runs and passes.
2. The auto-review workflow (`pr-review.yml`) successfully clones the
   pr-agent source from jclee941/.github, installs it, and posts a code
   review comment on this PR via cli_proxy.
3. The PR auto-merges only after all required pr-checks contexts pass.

If you see this file in master, the verification succeeded.
