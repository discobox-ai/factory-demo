---
name: verify-recipes
description: How to verify a change to Tip Split at runtime — serve or open the page, set its state from the query string, screenshot it in headless Chromium, and read the result. Use when verifying a change, taking the before/after screenshots a PR needs, or reproducing a reported bug.
---

# Verifying Tip Split

The page is the product. A change is verified when the page, in a real
browser, shows the right thing for the state the issue is about.

## Set the state

`index.html` reads its starting state from the query string:

| Parameter | Field | Example |
|---|---|---|
| `bill` | Bill | `bill=50` |
| `tip` | Tip percent, as a button would set it | `tip=18` |
| `people` | People | `people=3` |

States worth knowing: `bill=50&tip=15&people=3` (a share that isn't a whole
number of cents), `bill=50&tip=20&people=2` (the 20% tip),
`bill=50&tip=15&people=0` (nobody to split between).

A query string sets values once, at load. A bug in how the page reacts to
typing or clicking needs a real interaction: drive it with Chromium's
DevTools protocol, or reproduce it in `tip.js` with a test and screenshot the
state it ends in.

## Screenshot

```sh
scripts/screenshot /tmp/shot.png 'bill=50&tip=15&people=3'
```

Then read the image (it's a PNG; your harness can show it to you). Check the
numbers on it, not just that it rendered. For a PR, the screenshots go in
`docs/screenshots/` (`AGENTS.md`, Screenshots are part of every PR).

`chromium` is a discobox feature that installs in the background on a new
box; if it's not there yet, wait a minute and retry.

## Serve it

`python3 -m http.server 8000` from the repository root serves it for a
person to click through (the `discobox` skill says how they reach a port).
