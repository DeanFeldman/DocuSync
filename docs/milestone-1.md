# Milestone 1 build checklist

## Completed in this starter

- [x] Separate frontend and backend.
- [x] Hand-written HTTP API.
- [x] Relational persistence model.
- [x] Secure filename generation and private local storage layout.
- [x] Original uploads remain unchanged.
- [x] DOCX extraction prototype.
- [x] Exact paragraph matching.
- [x] User-controlled replacement preview.
- [x] Versioned generated copies and ZIP download.
- [x] Representative automated workflow test.
- [x] GitHub Actions CI skeleton.
- [x] Architecture decision record.
- [x] API and setup documentation.

## Required before Milestone 1 submission

- [ ] Confirm team members and contribution workflow.
- [ ] Add branch protection and issue/PR templates to the real repository.
- [ ] Integrate an established authentication provider.
- [ ] Add backend ownership and organisation checks.
- [ ] Test at least 10 representative real documents.
- [ ] Record formatting-preservation results and unsupported features.
- [ ] Add wireframes and accessibility review evidence.
- [ ] Deploy frontend, backend, database, and documentation site.
- [ ] Gather stakeholder feedback and record exactly what was changed.
- [ ] Add an AI-use entry for each AI-assisted contribution.

## Acceptance scenario represented by the automated test

1. Create three DOCX agreements.
2. Give each agreement a different building name and address.
3. Include the same monthly-reporting paragraph in all three.
4. Upload all files.
5. Select the exact-match link group.
6. Preview replacement wording.
7. Generate updated copies.
8. Verify the replacement appears in all generated documents.
9. Verify each unique building name remains intact.
10. Verify each original source file is byte-for-byte unchanged.
