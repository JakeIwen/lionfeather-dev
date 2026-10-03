# Lionfeather

Personal engineering website for Jacob Iwen at lionfeather.dev. Make his work,
project write-ups, public resume, and contact information easy to find.

## Local context

If `AGENTS.private.md` exists, read it before researching biographical content or
updating the resume. It contains local source references and factual limits and
is intentionally ignored by Git. Never copy private context into public files,
logs, build output, or commits. The app must build without that file or any
external private checkout.

## Stack and commands

- React, TypeScript, React Router, and Vite, using Node.js 22.12+ and npm.
- `npm ci`: install the locked dependencies.
- `npm run dev`: start Vite with live updates on loopback port 5175.
- `npm run build`: typecheck, build the static site, and check public artifacts.
- `npm run typecheck`: check application and tooling TypeScript.
- `npm run preview`: preview the production build on loopback port 4173.
- `npm run check:public`: check Git exclusions and generated public artifacts.
- `npm run check:resume`: confirm the public resume matches the current public
  master named by the resume repository's content master; see the README.
- `npm run cloudflare:login`: authorize the Cloudflare CLI through browser consent.
- `npm run deploy:check`: build, run the resume check, and dry-run the deployment.
- `npm run deploy`: build, check public artifacts and the resume, and publish to
  lionfeather.dev.
- `npm start`: serve the existing production build on loopback port 5174.
- `npm test`: exercise static-serving boundaries and lifecycle ownership checks.
- `npm run service:prepare`: build and validate a local boot-service plist.
- `npm run service:install`: build, install the macOS boot service, and verify
  automatic restart. Run from normal Terminal as the user, not under sudo.
- `npm run service:status`: read-only installation/health/ownership status.
- `npm run service:start`, `service:stop`, `service:restart`, `service:verify`,
  `service:uninstall`: manage only this project's service; see
  `docs/local-hosting.md`. Stop disables startup until Start re-enables it.

## Project map

- `src/`: application, page components, project content, and styles.
- `public/`: intentionally public static files, including the downloadable resume.
- `scripts/`: static server, launchd controller, tests, and build validation;
  not shipped to the browser.
- `dist/`: generated site; never edit or commit it.

Only the generated `dist/` directory is eligible for static deployment. Do not
serve or upload the repository root. `wrangler.jsonc` configures Cloudflare Workers
Static Assets for `lionfeather.dev`, with SPA routing and no server-side Worker.
Wrangler manages the custom domain's DNS and certificate. The `www` hostname is
not configured. Verify live deployment status; configuration is not publication.

The stable production URL is http://127.0.0.1:5174. The macOS boot job is
`system/com.<username>.lionfeather-org`, running as the normal user with RunAtLoad
and KeepAlive. It must be installed before claiming persistent hosting. Inspect
live status; a prepared plist or manual process is not boot registration. The
controller changes no other local apps. Health/ownership PID and instance must
agree before shutdown. Use the authenticated stop endpoint through the controller
instead of guessing PIDs. Ownership is written after bind and removed only by
the matching instance. Keep lifecycle data and logs under ignored `.local/service`.

On 2026-09-30, the installed job was verified against the renamed
`lionfeather-dev` checkout, and a controlled worker exit confirmed
automatic launchd replacement. The service label remains `lionfeather-org` for
compatibility. Recheck current status before maintenance; no reinstall is needed
merely because older notes mention the former directory.

The service reads built files without rebuilding at boot. After application edits,
run the build and reload the browser. Vite development remains on 5175, with
polling enabled because native file events missed workspace edits on this Mac.

## Content and design

- Keep Jacob Iwen prominent; Lionfeather is the secondary identity.
- Lead with specific engineering work and feature the van dashboard alongside
  professional production systems.
- Write clear, natural professional prose. Each sentence should add a fact,
  reason, or necessary context. Avoid generic enthusiasm, inflated claims,
  repeated conclusions, unnecessary em dashes, and keyword inventories.
- Explain the problem, contribution, decision, and result. Distinguish individual
  and team work, development benchmarks and production outcomes, and staged and
  deployed changes. Verify claims before expanding them.
- Use meaningful metrics with their conditions. Never invent accomplishments,
  motivations, technologies, or responsibilities.
- Copy the approved public resume; do not create a separate content master here.
- Use clear typography, restrained color, accessible controls, and responsive
  layouts. Keep implementation notes out of ordinary visitor flows.
- Technology labels use plain dot-separated text. The homepage stack ends in
  `AI → Python & CAN`, with the arrow matching the gray dots. Avoid decorative project
  numbers and button-like styling on noninteractive metadata.
- Visible lines should be labels, facts, or actions; eyebrows stay only when
  they carry data. A 2026-10-02 review removed most slogans. Jacob deliberately
  kept these, so do not re-flag them: the hero line "I build software.", the
  text under the van illustration, "Selected work.", "A few things I've built",
  "Let's talk" (header) and "Let's talk shop." (contact), the 404 page, the
  "Explore my work" button, and the van dashboard
  project title.
- Non-heading font sizes were increased by approximately 20%, rounded to whole
  pixels; preserve those readable sizes and the unchanged heading hierarchy.
- The van dashboard homepage preview frames the first three screenshot rows;
  its project page preserves the complete image. Source attribution is recorded
  in `docs/media-sources.md`.
- The dashboard screenshot's Wi-Fi name is redacted. Jacob explicitly chose to
  retain the other device names and historical status details. Preserve that
  scope and keep the unredacted original outside the public assets.
- Fieldwork screenshots use a compact carousel with arrows, a slide count,
  labeled thumbnails, keyboard navigation, and full-size links. Retain visible
  AI research/design/review tools and connection indicators; use example records
  and prompts, and keep private histories and employer-message drafting out of
  portfolio captures. The case study should show Jacob's review and decisions.
- Van telemetry is a separate project from the van-controls dashboard. Its page
  covers CAN signal discovery, independent validation, the Python broker, and
  the Preact tablet UI. Preserve source-quality distinctions; a correlation is
  not proof of a signal's physical meaning. Evidence references stay private.
- Telemetry screenshots use illustrative data; the warning conversation is
  simulated. Preserve those captions. Never use the screenshots as evidence of
  an actual drive, diagnosis, warning installation, or successful vehicle action.
- Fieldwork and telemetry share `ScreenshotCarousel.tsx`. Preserve arrows,
  counters, thumbnails, keyboard/focus behavior, full-size links, and image ratios.
- Appearance uses a header Soft/Dark control. `public/theme.js` applies the saved
  `lionfeather-theme-v1` choice before rendering, otherwise follows the system.
  `ThemeToggle.tsx` maintains it across routes and reloads, with graceful behavior
  when storage is unavailable. Theme the UI without filtering screenshot pixels.

## Demonstrations and privacy

- Dashboard demos run entirely on simulated browser-local state. Clearly label
  simulated data and controls. Never connect them to live devices, private APIs,
  vehicle controls, or operational configuration.
- Do not publish personal addresses, private contact details, credentials,
  internal records, planning notes, or proprietary client code/screenshots.
- Put only intentionally public assets in `public/`. Keep local-only material
  outside the application import graph and covered by `.gitignore`.
- `scripts/public-assets.json` is the reviewed public-file inventory. Changed
  images, PDFs, fonts, and security headers require content/metadata review before
  updating hashes. Never refresh hashes merely to make a failing build pass.
- The resume check reads the private resume repository's location from ignored
  `.local/resume-source.json`; keep that path out of tracked files. The build
  itself must keep working without the file or the repository.
- `scripts/public-audit.mjs` enforces the upload boundary, inventory, and common
  secret/private-address checks. Binary hashes preserve reviewed bytes; they do
  not replace reviewing image pixels or PDF text, links, and metadata.
- Cloudflare `_headers` blocks runtime connections and external subresources.
  Verify it using Wrangler or the public host; the local macOS server does not
  interpret `_headers`. Keep Wrangler CLI telemetry disabled.
- Keep fonts and illustrations local so the site works without third-party
  runtime requests. Do not add analytics or tracking without a relevant request.

## Verification and working agreements

- The primary branch is `master`; use it as the GitHub default branch.
- Run `npm run build` after application changes. Verify relevant interactions,
  resume download, routing, mobile layout, keyboard behavior, and browser errors.
  Add behavioral tests where useful; avoid tests that just repeat static copy.
- Use `browser_clean` for localhost and public-site verification. Use
  `browser_live` only when existing authentication or exact live-tab state is
  required. Never relaunch the user's browser or improvise shell-launched
  browsers, ad-hoc WebDriver, or coordinate automation.
- If browser tools fail, run `codex-browser status`; for an unhealthy clean
  service use `codex-browser-service status`. `codex-browser smoke` checks the
  clean driver end to end.
- Inspect current files and Git state; preserve unrelated work. Do not stage or
  change the Git index unless explicitly asked. Summarize edits instead of
  printing diffs or patches unless requested.
- For substantive multi-session work, keep a concise note in ignored
  `.agent/handoffs/<workstream>.md`; list and reuse matching workstreams first.
  Replace stale information. When finished, promote durable project facts here
  (private context stays private) and delete the completed handoff. Code, Git
  state, and test results outrank notes.
- Ask about ambiguity that materially changes the result; otherwise state a
  reasonable assumption and continue authorized work.
- Give exact CLI commands when the user must act. For multiline clipboard
  payloads, create and validate a UTF-8 file, then provide an absolute-path
  `pbcopy` command rather than a pasted heredoc.
