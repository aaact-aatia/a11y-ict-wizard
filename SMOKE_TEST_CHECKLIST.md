# Smoke Test Checklist

Purpose: manual smoke coverage for dependency refresh PRs on the 2025 branch.

Scope for this PR:
- Wizard flow
- Question CMS import/export
- Document generation

## Environment

- Branch: issue-161-dependency-refresh
- Runtime target: Node 24.x
- App URL (local): http://localhost:3001

## Setup

1. Start required services.

```bash
docker compose up --build
```

2. Confirm the app is reachable.

```bash
curl -I http://localhost:3001
```

Expected:
- HTTP 200 response from the root route.

## Smoke Tests

### 1. Wizard flow

1. Open:
- http://localhost:3001/
- http://localhost:3001/fr/

2. Verify Step 1 renders dynamic questions in both languages.
3. Select multiple representative options and continue.
4. Verify Step 2 clause tree renders and can be edited.
5. Continue to Step 3 and verify document template choices render.

Expected:
- No server errors.
- Navigation between steps works.
- Selections persist between steps.

Result:
- [ ] Pass
- [ ] Fail
Notes:

### 2. Question CMS import/export

1. Open:
- http://localhost:3001/edit/questions

2. Download current questions JSON via the Questions download action.
3. Restore questions using JSON/questions_list.json.
4. Reload questions list and confirm records display correctly.

Expected:
- Download succeeds.
- Restore succeeds without runtime errors.
- Questions list remains usable after restore.

Result:
- [ ] Pass
- [ ] Fail
Notes:

### 3. Document generation

1. Complete wizard inputs to reach generation step.
2. Generate one English output and one French output.
3. Generate at least one HTML output and one DOCX output.

Expected:
- Files generate successfully.
- Generated content is not empty.
- No 500 errors in server logs during generation.

Result:
- [ ] Pass
- [ ] Fail
Notes:

## Optional quick checks

1. Confirm restore endpoints are responsive:
- /edit/questionsdownload
- /edit/questionsrestore

2. Confirm no Node runtime drift:
- package.json engines.node is 24.x
- Dockerfile base image is node:24-alpine
- workflow uses node-version 24.x

## Reviewer sign-off

- Reviewer:
- Date:
- Overall result: [ ] Pass [ ] Fail
- Follow-up issues (if any):
