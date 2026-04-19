# Study With B Release Checklist

Use this checklist before every deployment.

## Pre-Release

- [ ] Confirm Timer and Planner tabs are visible and clickable.
- [ ] Confirm only one stage card is visible at a time:
  - [ ] Timer tab -> only timer-stage visible
  - [ ] Planner tab -> only planner-stage visible
- [ ] Complete one Work session and confirm history entry appears.
- [ ] Verify planner task progress updates on completed Work sessions.
- [ ] Verify Short Break and Long Break sessions do not increment task progress.
- [ ] Test task lifecycle:
  - [ ] Add task
  - [ ] Mark done
  - [ ] Reopen
  - [ ] Archive and restore
- [ ] Validate mobile layout at narrow width.
- [ ] Validate install prompt behavior (where supported).

## Sync And Versioning

- [ ] Root and docs files are in parity:
  - [ ] index.html
  - [ ] app.js
  - [ ] style.css
  - [ ] sw.js
- [ ] Service worker cache version is bumped.
- [ ] Core assets (HTML/CSS/JS) are loading current versions after refresh.

## Deployment

- [ ] Commit with release message.
- [ ] Push to main.
- [ ] Confirm latest pages-build-deployment workflow succeeds.
- [ ] Open live site with a cache-busting query once:
  - [ ] https://thebusisiwe.github.io/studywithb/?v=<commit>

## Post-Release Smoke Test

- [ ] Timer/Planner switching works on live URL.
- [ ] Update banner appears during update and reloads cleanly.
- [ ] No console/runtime errors during startup.
- [ ] Site renders correctly in at least one desktop and one mobile browser.
