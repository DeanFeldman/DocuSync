# Desktop test and evidence checklist

## Automated verification

```powershell
npm ci
python -m pip install -r apps/api/requirements-build.txt
npm test
npm run build:web
npm run dist:win
```

`npm test` runs both the Python/FastAPI and retained Node suites. Coverage includes DOCX validation and immutable generation, exact-match discovery, target validation, continued-version state, ZIP creation, desktop-session protection, static frontend serving, retained template processing, frontend request construction, safe native-save boundaries, and packaging.

## Packaged workflow smoke — 21 July 2026

- [x] Packaged Electron backend reached `/api/health`.
- [x] The installed renderer exposed neither `window.require` nor `window.process`.
- [x] Three sample DOCX agreements uploaded in one related set.
- [x] Microsoft Word generated and displayed the real layout preview.
- [x] The shared paragraph produced three confirmed exact-match locations.
- [x] Impact review showed all three documents before generation.
- [x] Applying the change returned to the workspace and kept editing available.
- [x] The refreshed Word preview displayed the replacement paragraph.
- [x] The final ZIP endpoint returned a valid 99,981-byte response.
- [x] No renderer console or page errors were observed.

Evidence: [packaged Phase 2 desktop workflow](evidence/phase2-desktop-main.png).

## Local desktop manual test

- [ ] `npm start` opens one DocSync desktop window without a browser.
- [ ] No separate backend terminal command is required.
- [ ] Upload and structured-preview errors remain visible without closing the app.
- [ ] “Done editing — download all” opens the Windows save dialog.
- [ ] Cancelling the save dialog does not delete the generated versions.
- [ ] Saving writes a ZIP containing every current DOCX.
- [ ] Further edits can be applied before the final download.
- [ ] Closing the window stops the local FastAPI process.

## Keyboard and accessibility check

- [ ] Complete upload, document switching, view switching, selection, target review, impact review, generation, and download using only the keyboard.
- [ ] Focus is always visible and follows a logical order.
- [ ] Every input has a visible programmatic label.
- [ ] Loading, generation, and error messages are announced appropriately.
- [ ] The workflow does not depend only on colour or mouse interaction.
- [ ] At 200% Windows text scaling, controls remain readable and operable.

## Resize check

- [ ] 1440 × 940 shows files, document preview, and controlled-edit sidebar.
- [ ] At the 760-pixel minimum width, every workflow action remains reachable without horizontal page scrolling.
- [ ] Preview tabs, structured elements, target checkboxes, and final download remain keyboard accessible at narrow widths.

## Clean-machine installer test

Record Windows version, account type, installer filename, SHA-256, tester, date, screenshots, and defects.

- [ ] Start with a normal Windows user account without Node.js or Python.
- [ ] Run the assisted setup executable and choose or confirm the installation location.
- [ ] Confirm Start Menu entry and desktop shortcut behavior.
- [ ] Launch from the Start Menu.
- [ ] Upload representative DOCX files, render through an installed Microsoft Word, edit, continue editing, and save the final ZIP.
- [ ] Close and reopen the installed application.
- [ ] Uninstall through Windows Settings.
- [ ] Confirm shortcuts and installed application files are removed.

Unchecked items must not be reported as passed.
