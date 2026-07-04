# Auto Refresh

Auto Refresh is a browser extension for **Firefox** and **Zen Browser** that automatically reloads
the tabs you choose, at the interval you choose, and stops exactly when you tell it to.

It is useful for dashboards, live scoreboards, build monitors, auction pages, status pages, and any
other page you want to keep up to date without pressing the reload button yourself.

Auto Refresh runs entirely inside your browser. It has no account, no server, and no tracking. Your
tabs, settings, and schedules never leave your computer.

## Contents

- [What Auto Refresh does](#what-auto-refresh-does)
- [Supported browsers](#supported-browsers)
- [Installing Auto Refresh](#installing-auto-refresh)
- [Selecting tabs](#selecting-tabs)
- [Choosing an interval](#choosing-an-interval)
- [Stop conditions](#stop-conditions)
- [Pause, resume, edit, stop, and remove](#pause-resume-edit-stop-and-remove)
- [What happens after a browser restart](#what-happens-after-a-browser-restart)
- [Navigation safety](#navigation-safety)
- [Cache bypass](#cache-bypass)
- [Privacy](#privacy)
- [Safety and limitations](#safety-and-limitations)
- [Installing a beta version](#installing-a-beta-version)
- [Developing Auto Refresh](#developing-auto-refresh)
- [Running the tests](#running-the-tests)
- [Building the extension](#building-the-extension)
- [Docker validation](#docker-validation)
- [Troubleshooting](#troubleshooting)

## What Auto Refresh does

- Reloads one or more open tabs on a timer.
- Lets you set the interval in seconds, minutes, or hours (minimum 30 seconds).
- Reloads forever, or stops after a duration, a number of reloads, or a specific date and time.
- Lets you pause, resume, edit, stop, and remove each schedule.
- Shows the time until the next reload and how many reloads have happened.
- Shows a small number on the toolbar button counting the active schedules.
- Optionally shows a notification when a schedule finishes.
- Recovers your schedules safely when you restart the browser.

## Supported browsers

- **Firefox** (desktop, current stable release; recent ESR where practical).
- **Zen Browser** (desktop), which uses the same Firefox extension package.

Auto Refresh only runs while the browser is open. It cannot reload tabs after the browser is closed.

## Installing Auto Refresh

### From Mozilla Add-ons (recommended once published)

1. Open the Auto Refresh listing on [addons.mozilla.org](https://addons.mozilla.org).
2. Select **Add to Firefox**.
3. Confirm the permissions when your browser asks.

The same package installs on Zen Browser through the Firefox add-on ecosystem.

### Manual temporary install (for testing a build)

1. Build the extension (see [Building the extension](#building-the-extension)), which creates a
   `dist` folder.
2. Open `about:debugging#/runtime/this-firefox` in Firefox or Zen Browser.
3. Select **Load Temporary Add-on**.
4. Choose the `dist/manifest.json` file.

A temporary add-on is removed when you close the browser. It is only meant for testing.

## Selecting tabs

1. Select the Auto Refresh toolbar button to open the popup.
2. The popup lists the eligible tabs in the current window.
3. Tick the tabs you want to refresh, or use **Select all**.

Only normal web pages (addresses starting with `http://` or `https://`) can be scheduled. Internal
browser pages such as `about:`, extension pages, and local files are not eligible and are not shown
as selectable.

## Choosing an interval

Enter a number and pick a unit:

- **Seconds** for fast updates (minimum 30 seconds).
- **Minutes** for most dashboards.
- **Hours** for slow-moving pages.

Intervals shorter than 30 seconds are not allowed. This protects the websites you visit from
excessive traffic and keeps your browser responsive.

## Stop conditions

Pick how each schedule should end:

- **Never** — keep reloading until you pause, stop, or remove the schedule.
- **After a duration** — stop after a length of time, for example 30 minutes.
- **After a number of reloads** — stop after an exact count, for example 10 reloads.
- **At a date and time** — stop at a specific moment, for example today at 18:00.

Counting rules:

- A **count** schedule performs exactly the number of **successful** reloads you asked for. A failed
  reload does not use up one of your counts.
- A **duration** schedule never reloads after its time limit has passed.
- A **date and time** schedule never reloads at or after the moment you set.

## Pause, resume, edit, stop, and remove

Each schedule appears as a card in the popup with its status and controls:

- **Pause** temporarily stops reloading without losing the schedule.
- **Resume** continues a paused schedule.
- **Edit** changes the interval, stop condition, or options of an active or paused schedule.
- **Stop** ends a schedule immediately and marks it finished.
- **Remove** deletes a finished, stopped, orphaned, or errored schedule from the list.

Each card also shows the countdown to the next reload and the number of reloads completed so far.

## What happens after a browser restart

Auto Refresh saves your schedules in your browser profile, so they survive a restart.

When the browser starts again:

- Your schedules are loaded from storage.
- Tabs that are still open are matched back to their schedules where the browser allows it.
- Schedules whose tab is gone are marked **orphaned** so you can remove them or start again.
- By default, restored schedules are **paused** so nothing reloads unexpectedly. You can change this
  in the options page to automatically resume schedules whose tab was restored.

Auto Refresh never performs a burst of catch-up reloads for time that passed while the browser or
computer was asleep. It reloads at most once when it is due and then continues on the normal
interval.

## Navigation safety

You choose what should happen if the page in a scheduled tab changes address:

- **Same origin** (default) — keep reloading only while the tab stays on the same site (same
  protocol, host, and port). If the tab moves to a different site, the schedule pauses.
- **Exact URL** — keep reloading only while the address stays the same. If the address changes, the
  schedule pauses.
- **Follow tab** (advanced) — keep reloading whatever the tab currently shows, even if the address
  changes. Use this carefully, because it can reload a page you did not intend.

## Cache bypass

Each schedule can optionally **bypass the cache**. When this is on, Auto Refresh asks the browser to
fetch a fresh copy from the network instead of reusing cached files, similar to a hard refresh. Leave
it off for normal reloads.

## Privacy

Auto Refresh is local-first:

- No account and no sign-in.
- No server, no cloud sync, and no remote configuration.
- No analytics, tracking, advertising, or crash reporting.
- Your tab addresses, tab titles, schedules, and settings stay in your browser profile and are never
  transmitted anywhere.

## Safety and limitations

Automatic reloading repeats whatever loading the page does. Before starting a schedule, keep in mind
that a reload can:

- **discard unsaved changes** in forms or editors;
- **repeat an action**, and pages created by submitting a form may ask you to confirm resubmission;
- **trigger a website's rate limits** if the interval is short;
- **interrupt media playback or interactive sessions.**

Auto Refresh only reloads pages. It does not read page content, fill in forms, click buttons, run
scripts on pages, solve CAPTCHAs, or bypass any website's limits.

## Installing a beta version

Beta builds are distributed as a separate, Mozilla-signed `.xpi` file with a different add-on ID, so
they can be installed alongside the stable version.

1. Download the beta `.xpi` file provided by the maintainer.
2. Open `about:addons`.
3. Select the gear icon, then **Install Add-on From File**.
4. Choose the `.xpi` file and confirm.

Only install beta files from a source you trust.

## Developing Auto Refresh

You need [Node.js 24 LTS](https://nodejs.org) (or newer) and npm.

Install the dependencies:

```bash
npm ci
```

### Firefox development mode

This builds the extension and launches a temporary Firefox profile with Auto Refresh loaded:

```bash
npm run dev:firefox
```

### Zen Browser development mode

Point the command at your Zen Browser executable:

```bash
ZEN_BIN=/path/to/zen npm run dev:zen
```

On most Linux systems the executable is `zen` or `zen-bin`. On macOS it is inside the app bundle, for
example `/Applications/Zen Browser.app/Contents/MacOS/zen`.

## Running the tests

```bash
npm run test
npm run test:coverage
```

The end-to-end tests drive a real Firefox instance and a local fixture server. They do not use any
external website.

```bash
npm run test:e2e
```

## Building the extension

```bash
npm run build
```

The build output is placed in `dist`. To create a distributable ZIP:

```bash
npm run package
```

Packages are written to `artifacts`.

## Docker validation

You can run the full quality gate in a reproducible container:

```bash
docker compose build
docker compose run --rm workspace npm run verify
```

## Troubleshooting

- **A tab is not listed as selectable.** Auto Refresh only schedules `http://` and `https://` pages.
  Internal browser pages, extension pages, and local files cannot be scheduled.
- **A schedule shows "orphaned".** Its tab was closed or could not be matched after a restart. Remove
  it, or open the page again and create a new schedule.
- **A schedule paused on its own.** With the default same-origin safety, moving the tab to another
  site pauses the schedule. Resume it, or choose a different navigation policy when creating it.
- **Reloads seem slower than the interval.** When many schedules are due at once, Auto Refresh spaces
  the reloads out to stay within a safe rate. The countdown reflects the real next reload time.
- **Nothing reloads after the computer woke from sleep.** Auto Refresh does not run catch-up bursts.
  It resumes on the next scheduled reload.
