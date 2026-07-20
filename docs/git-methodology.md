# Git methodology

## Branches

- `main`: stable, reviewed, deployable work.
- `develop`: optional integration branch while the team is learning the workflow.
- `feature/<issue-number>-short-name`: product or technical work.
- `fix/<issue-number>-short-name`: defect corrections.
- `docs/<issue-number>-short-name`: documentation-only work.

## Commits

Use small commits that explain intent. Suggested prefixes are `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, and `chore:`. Reference the issue number in the commit or pull request.

## Pull requests

Every pull request should:

1. Link an issue.
2. Explain the user-visible or technical change.
3. Include acceptance evidence.
4. Add or update tests where relevant.
5. Update documentation.
6. Pass CI.
7. Be reviewed by another team member before merging.

## Merge policy

Prefer squash merging for feature branches so the main history remains readable. Do not merge when required CI checks fail. Tag milestone demonstration versions.

## AI-assisted work

Record the tool, model, date, team member, task, output used, verification method, and changes made by the student. AI-generated code must be understood, tested, reviewed, and attributed before merge.
