# Protecting `main`

The active GitHub repository ruleset named **Protect main** targets only
`refs/heads/main`. Its intended configuration is recorded in
`.github/rulesets/main.json`. The live GitHub setting is what enforces the rule;
the JSON file is a reviewable record for checking or restoring it.

The ruleset requires a pull request, a successful `test` check from the GitHub
Actions app, and resolved review conversations. It requires the PR to be
tested against the latest `main`. It blocks force pushes and deletion. There
are no standing bypass actors, including administrators. The required approval
count is currently zero so the founder can merge a checked PR while working
alone. Add an independent approval requirement when a second active maintainer
can reliably review changes. `GOVERNANCE.md` still calls for two-person review
when possible for durable decisions about licenses, destructive migrations,
privacy, public data contracts, or institutional exclusivity.

## Verify the live setting

With `gh` authenticated as a repository administrator:

```sh
gh api repos/openazulejos/open-azulejos/rulesets
gh api repos/openazulejos/open-azulejos/rules/branches/main
```

The ruleset should be active and the second command should show its effective
rules. Check a recent PR's **Checks** tab before changing the required context:
this repository's `ci` workflow publishes the job name `test`. GitHub rulesets
match the job name, rather than `ci / test` as displayed in some screens.
Before merging, verify that a PR without a passing `test` check is blocked and
that a passing PR can merge. After merging, verify the `Deploy production`
workflow and the affected flow on `openazulejos.com`.

## Emergency recovery

No routine direct push to `main` is permitted. If the rule itself prevents an
urgent repair, an organization owner may temporarily disable the specific
ruleset in **Settings → Rules → Rulesets**. Record who changed it, the reason,
the time, and the affected commits in an incident record; use a private record
for security or personal-data incidents. Restore the ruleset to **Active** as
soon as the repair is merged, and verify its effective rules again. Never use
this process to skip a failing test without understanding the failure.

The production deployment workflow is separate from this ruleset. A merge to
`main` still starts it; deployment protections are tracked separately.
