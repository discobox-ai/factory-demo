# Tip Split

One static page (`index.html`, `style.css`, `app.js`) over one module of
arithmetic (`tip.js`). No build, no dependencies.

## Build, test, run

- **Test:** `node --test` (Node's own runner; tests in `test/`). Every change
  to `tip.js` comes with a test for what it changed.
- **Run:** open `index.html`, or `python3 -m http.server 8000` in the
  repository root. The query string sets the starting state:
  `index.html?bill=50&tip=18&people=3`.
- **Look at it:** `scripts/screenshot OUT.png [QUERY]` (headless Chromium).

## CI

There is none. A PR with no checks is green once `node --test` passes in the
box; say so in its Evidence. Don't wait for checks that will never come.

## Screenshots are part of every PR

Anything that changes what the page shows carries a **before and after
screenshot** of the state the issue is about:

1. Before changing anything, on the base commit:
   `scripts/screenshot docs/screenshots/issue-<N>-before.png '<query>'`.
2. After the fix: `scripts/screenshot docs/screenshots/issue-<N>-after.png '<query>'`.
3. Commit both on the PR's branch, with the fix.
4. Embed them in the PR body's Evidence, pinned to the commit that added
   them so they keep rendering after the branch is gone:

   ```markdown
   | Before | After |
   |---|---|
   | ![before](https://github.com/<owner>/<repo>/blob/<sha>/docs/screenshots/issue-<N>-before.png?raw=true) | ![after](https://github.com/<owner>/<repo>/blob/<sha>/docs/screenshots/issue-<N>-after.png?raw=true) |
   ```

Pick the query that shows the bug (`verify-recipes` has examples), and look at
both images yourself before you push: the after one must show the fix.
