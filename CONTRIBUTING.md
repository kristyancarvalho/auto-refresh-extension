# Contributing to Auto Refresh

Thank you for contributing to Auto Refresh.

Auto Refresh is a local-first Firefox and Zen Browser extension that reloads selected tabs at configurable intervals and stops according to user-defined limits.

This document defines the issue workflow, branch strategy, versioning rules, commit convention, validation requirements, Docker usage, documentation policy, and release process.

## Core rules

1. Start every implementation from a GitHub issue.
2. Classify work as `task`, `enhancement`, or `bug` when creating issues.
3. Use focused local `stage/*` branches.
4. Create stage branches from `dev`.
5. Keep stage branches local unless review requires a remote branch.
6. Validate every change before merging.
7. Merge validated stage branches into `dev`.
8. Push `dev` after each validated merge.
9. Update `main` only during an explicit release.
10. Write all versioning, commits, issues, documentation, and release notes in English.
11. Keep final source code free of comments.
12. Keep development-only documentation under `/specs` and out of version control.
13. Keep the public README understandable by non-experts and include practical examples.
14. Use TypeScript, Node.js, npm, and Prettier.
15. Use Docker for reproducible validation and Firefox E2E tests where practical.

## Development stack

The project uses:

- TypeScript;
- Node.js 24 LTS;
- npm;
- Prettier;
- Vite;
- Vitest;
- web-ext;
- Selenium WebDriver;
- Docker Compose.

Do not migrate to Yarn or pnpm.

Do not add a heavy framework or dependency without a clear maintenance benefit.

## Issue-first workflow

Every change starts with an issue.

Use GitHub CLI when available.

Inspect the repository before creating work:

```bash
git status
git branch --show-current
git remote -v
gh auth status
gh repo view
gh issue list --limit 100
gh label list
gh milestone list
```

Supported issue types:

| Type | Use when |
|---|---|
| `task` | Repository, tooling, documentation, testing, release, maintenance, or operational work. |
| `enhancement` | New or improved extension behavior or user experience. |
| `bug` | Incorrect behavior, regression, broken workflow, invalid state, or failed compatibility. |

Issue titles should be concise and specific:

```txt
task: configure Firefox extension build
enhancement: add count-limited refresh jobs
bug: prevent duplicate alarms after startup
```

Avoid vague titles:

```txt
update app
fix things
misc changes
make better
```

Each issue must include:

- context;
- goal;
- scope;
- out of scope;
- implementation tasks;
- acceptance criteria;
- testing notes;
- validation commands;
- target milestone;
- labels.

Use repository issue templates when available.

## Labels

Use labels to identify type, area, platform, priority, and status.

Recommended labels:

```txt
type: task
type: enhancement
type: bug

area: background
area: popup
area: options
area: scheduling
area: storage
area: tabs
area: sessions
area: alarms
area: ui
area: accessibility
area: testing
area: docker
area: packaging
area: distribution
area: docs
area: release

platform: firefox
platform: zen
platform: cross-browser

priority: low
priority: medium
priority: high
priority: critical

status: ready
status: blocked
```

Create missing labels through GitHub CLI when permissions allow it.

## Milestones

Group planned work under semantic-version milestones.

Recommended release train:

```txt
0.1.0 — Repository and extension foundation
0.2.0 — Scheduling domain and persistence
0.3.0 — Popup and options experience
0.4.0 — Recovery and navigation safety
0.5.0 — Testing and Docker validation
0.6.0 — Packaging and AMO readiness
1.0.0 — Stable Auto Refresh release
```

Do not duplicate equivalent milestones.

Close a milestone only when:

- all associated issues are closed;
- required validation passes;
- documentation is current;
- the milestone acceptance criteria are satisfied.

## Branch strategy

The stable branch is:

```txt
main
```

The active integration branch is:

```txt
dev
```

Normal implementation work targets `dev`.

Do not merge routine implementation directly into `main`.

`main` is updated through a deliberate release workflow.

### Local stage branches

Create one focused local branch for each issue or small coherent issue group.

Naming:

```txt
stage/<issue-id>-<short-area>
```

Examples:

```txt
stage/101-repo-foundation
stage/118-job-scheduler
stage/126-popup-form
stage/139-startup-recovery
```

Create the branch:

```bash
git checkout dev
git pull --rebase origin dev
git checkout -b stage/<issue-id>-<short-area>
```

Implement only the intended scope.

Run validation.

Rebase and merge:

```bash
git checkout dev
git pull --rebase origin dev
git checkout stage/<issue-id>-<short-area>
git rebase dev
git checkout dev
git merge --no-ff stage/<issue-id>-<short-area>
git branch -d stage/<issue-id>-<short-area>
git push origin dev
```

Do not push stage branches unless:

- a pull request is required;
- remote review is explicitly requested;
- branch protection prevents the normal local-stage workflow;
- collaboration requires a shared branch.

Close the issue only after the work is merged, pushed, and validated.

## Commit convention

Use:

```txt
type/area: summary; issue action issue_<id>
```

Examples:

```txt
chore/repo: configure extension workspace; close issue_101
feat/scheduling: add one-shot job alarms; close issue_118
feat/popup: add multi-tab refresh form; close issue_126
fix/recovery: prevent duplicate startup alarms; close issue_139
test/e2e: cover count-limited jobs; implements issue_145
docs/readme: document Zen setup; close issue_153
build/package: create source archive; close issue_161
release/root: prepare v1.0.0; close issue_175
```

Allowed types:

```txt
feat
fix
chore
docs
test
refactor
ci
build
style
perf
release
revert
```

Recommended areas:

```txt
repo
background
scheduling
storage
tabs
sessions
alarms
popup
options
ui
accessibility
testing
e2e
docker
manifest
package
distribution
readme
contributing
release
root
```

Rules:

- use English;
- use lowercase after the colon;
- use an imperative summary;
- keep the summary concise and specific;
- use `implements` for partial work;
- use `close` for work that completes the issue;
- do not use generic summaries such as `update`, `changes`, `misc`, `stuff`, `final`, or `wip`.

When GitHub automatic closing is required, add this to the commit body or pull request body:

```txt
Closes #<number>
```

## Semantic versioning

Use Semantic Versioning:

```txt
MAJOR.MINOR.PATCH
```

### Patch

Increment PATCH for:

- bug fixes;
- documentation corrections;
- packaging fixes;
- internal refactors without behavior change;
- test fixes;
- small compatibility corrections.

Example:

```txt
1.0.1
```

### Minor

Increment MINOR for:

- new stop conditions;
- new scheduling capabilities;
- new options;
- new user-facing workflows;
- new supported browsers without breaking existing behavior;
- meaningful UI additions.

Example:

```txt
1.1.0
```

### Major

Increment MAJOR for:

- incompatible stored-data migrations;
- breaking configuration changes;
- removal of existing behavior;
- incompatible permission changes;
- extension ID changes;
- major architecture changes requiring user action.

Example:

```txt
2.0.0
```

Use one unified extension version across:

- production manifest;
- beta manifest where applicable;
- package metadata;
- source archive name;
- runtime package name;
- release notes;
- Git tag.

Do not reuse a published version number.

## Source-code comments policy

Final source code must not contain comments.

Forbidden:

```txt
// line comments
/* block comments */
/** JSDoc comments */
# optional shell comments
<!-- HTML comments -->
commented-out code
TODO
FIXME
```

This rule applies to implementation, tests, scripts, examples, CSS, and configuration source where comments are optional.

Required shebangs are allowed only when technically necessary.

Use:

- clear names;
- small functions;
- explicit types;
- narrow interfaces;
- structured errors;
- tests;
- Markdown documentation.

Run:

```bash
npm run validate:no-comments
```

before merging.

## No placeholders

Do not leave:

```txt
TODO
FIXME
placeholder
temporary
mock for now
not implemented yet
later
```

If work is out of scope, do not add an unfinished implementation.

If work is in scope, complete it before closing the issue.

## Formatting

Use Prettier as the formatting source of truth.

Required commands:

```bash
npm run format
npm run format:check
```

Do not manually maintain formatting that conflicts with Prettier.

Run the format check before merging.

## TypeScript requirements

Use strict TypeScript.

Prefer:

- explicit public types;
- discriminated unions;
- typed result objects;
- typed browser API boundaries;
- dependency inversion for browser adapters;
- exhaustive state handling.

Avoid:

- `any` without a documented technical requirement;
- unchecked type assertions;
- unvalidated runtime messages;
- unvalidated storage values;
- hidden mutable global state;
- duplicated protocol types.

Run:

```bash
npm run typecheck
```

before merging.

## Testing requirements

Every behavior change must include tests at the appropriate level.

Required test layers:

| Layer | Purpose |
|---|---|
| Unit | Domain rules, scheduling, validation, state transitions, migrations, utilities. |
| Integration | Background use cases with fake browser adapters. |
| Browser UI | Popup and options behavior in a browser environment. |
| End-to-end | Real Firefox extension installation and refresh behavior. |
| Smoke | Manual Firefox and Zen Browser release checks. |

Minimum validation before merge:

```bash
npm run format:check
npm run typecheck
npm run test
npm run build
npm run lint:extension
npm run validate:no-comments
npm run validate:production-artifact
```

Preferred full gate:

```bash
npm run verify
```

Do not merge when a required command fails.

Do not claim a test passed unless it was executed successfully.

## Docker usage

Use Docker for reproducible validation and Firefox E2E tests where practical.

Recommended commands:

```bash
docker compose build
docker compose run --rm workspace npm ci
docker compose run --rm workspace npm run verify
docker compose up --build --abort-on-container-exit --exit-code-from e2e
```

Host execution is allowed for:

- interactive Firefox development;
- interactive Zen Browser development;
- `about:debugging` workflows;
- OS-specific browser paths;
- manual smoke tests;
- final package installation checks.

Do not force browser GUI development into Docker when host execution is clearer and more reliable.

## Host development

Firefox:

```bash
npm ci
npm run build:watch
npm run dev:firefox
```

Zen Browser:

```bash
ZEN_BIN=/path/to/zen npm run dev:zen
```

Do not hardcode a Zen executable path in versioned configuration.

## Documentation policy

All public documentation must be written in English.

The root README must be understandable by non-experts.

It should explain:

- what Auto Refresh does;
- supported browsers;
- how to install it;
- how to select tabs;
- how intervals work;
- how stop conditions work;
- how pause and resume work;
- how restart recovery works;
- privacy behavior;
- safety limitations;
- Firefox development;
- Zen development;
- Docker validation;
- testing;
- packaging;
- common troubleshooting.

Include concrete examples.

Do not assume the reader understands:

- WebExtensions;
- manifests;
- XPI files;
- AMO;
- browser alarms;
- extension profiles.

### Development documentation

Development-only documentation belongs in:

```txt
./specs
```

Examples:

```txt
./specs/SPEC.md
./specs/architecture.md
./specs/testing.md
./specs/distribution.md
./specs/decisions/
./specs/validation/
```

`./specs` is not versioned.

Do not commit files under `./specs`.

Confirm the ignore rule with:

```bash
git check-ignore -v specs
```

Public user or contributor information belongs in `README.md` or `CONTRIBUTING.md`.

## Pull requests

When pull requests are used, they should target `dev` for normal development.

A release pull request may target `main`.

Each pull request must:

- reference the issue;
- reference the milestone;
- summarize the change;
- include validation results;
- include screenshots for UI changes when useful;
- avoid unrelated changes;
- contain no final source comments.

Title format:

```txt
type/area: summary
```

Suggested body:

```md
## Summary

-

## Issue

Implements issue_<id>

## Validation

- [ ] `npm run format:check`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run lint:extension`
- [ ] `npm run validate:no-comments`
- [ ] `npm run validate:production-artifact`

## Checklist

- [ ] Scope matches the issue
- [ ] Tests were added or updated
- [ ] Documentation was updated when needed
- [ ] Final source code contains no comments
- [ ] No TODO or placeholder remains
```

## Release workflow

A release can be prepared only when:

- all milestone issues are closed;
- `dev` passes the full verification gate;
- Firefox E2E passes;
- Firefox manual smoke validation passes;
- Zen Browser manual smoke validation passes;
- README is accurate;
- production package validation passes;
- source package can reproduce the build;
- no comments remain in source code;
- no TODO or placeholder remains.

Release steps:

1. confirm the milestone is complete;
2. synchronize local `dev`;
3. run the full validation suite;
4. update the unified version;
5. update release notes or changelog;
6. generate the production ZIP;
7. generate the source ZIP;
8. inspect both archives;
9. create the release commit;
10. merge `dev` into `main` through the approved release process;
11. tag the release;
12. publish or sign only when explicitly authorized.

Release commit:

```txt
release/root: prepare v1.0.0
```

Tag:

```txt
v1.0.0
```

Do not publish to Mozilla Add-ons or create a GitHub release without explicit authorization.

## Review checklist

Before closing an issue or merging a stage branch, verify:

- [ ] The issue exists.
- [ ] The issue has the correct type and labels.
- [ ] The issue belongs to the correct milestone.
- [ ] The branch was created from `dev`.
- [ ] The implementation matches the issue scope.
- [ ] The commit follows `type/area: summary; issue action issue_<id>`.
- [ ] Tests were added or updated.
- [ ] Prettier check passes.
- [ ] Type checking passes.
- [ ] Relevant tests pass.
- [ ] Build passes.
- [ ] `web-ext lint` passes.
- [ ] Production artifact validation passes.
- [ ] Final source code contains no comments.
- [ ] No TODO or placeholder remains.
- [ ] Public documentation is in English.
- [ ] Public documentation is understandable by non-experts.
- [ ] Development-only documentation remains under ignored `/specs`.
- [ ] The stage branch was merged into `dev`.
- [ ] `dev` was pushed.

## Maintainer guidance

Prefer small, traceable changes over large mixed commits.

The issue, milestone, stage branch, commit, tests, documentation, and release history should describe the same change consistently.

