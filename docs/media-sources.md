# Media sources

## Form Engine product preview

- Local asset: `public/images/form-engine-portal.png`.
- Source page: https://www.formengine.com/.
- Original asset: https://images.squarespace-cdn.com/content/v1/64ac60135d4e981c63f982d8/42c38cfe-40a5-4f2c-8a94-de4d54d0e257/v2+updated-mockup-20260508+.png?format=1500w.
- Retrieved: 2026-09-20; PNG served by the source CDN, 1500 × 1170 pixels,
  unchanged after download.
- Attribution: Form Engine · Advantage Integrated Solutions.

The image is a product marketing preview. The project write-up separately
describes Jacob's contributions to the underlying platform. Third-party imagery
retains its owner's rights and is not licensed as part of this site's code.

## Van Dashboard

- Local asset: `public/images/van-dashboard.png`.
- Updated screenshot supplied by Jacob; PNG, 2236 × 1710 pixels. On 2026-09-30,
  the Wi-Fi network name was covered with an opaque mask at Jacob's request.
  All pixels outside that rectangle are unchanged. The original is kept only
  in ignored local audit storage and is not included in the public build.
- The homepage frames the first three rows using CSS; the project page and
  full-size link retain all four rows.
- The interactive demo on the project page uses separate simulated data.

## Original illustrations and fonts

The feather and van SVGs are defined in `src/Illustrations.tsx`.
Locally bundled font license notices are in `public/font-licenses.txt`.

## Van telemetry

Six selected 800 × 1280 PNGs from Jacob's telemetry-dashboard screenshot
collection, captured September 30, 2026 (app build `149aa5bc155f`), are copied
unchanged under `public/images/van-telemetry/`:

| Local file             | Original capture                              | View                                   |
| ---------------------- | --------------------------------------------- | -------------------------------------- |
| `drive.png`            | `01-drive-gauges.png`                         | Driving gauges                         |
| `parked.png`           | `03-parked-battery-tires-and-service.png`     | Battery, tires, and service overview   |
| `warning-evidence.png` | `06-warning-event-evidence.png`               | Saved warning evidence and timeline    |
| `history.png`          | `07-history-trips-and-temperature-trends.png` | Trip and temperature history           |
| `metric-catalog.png`   | `10-system-metric-catalog.png`                | Metric sources, quality, and freshness |
| `custom-warning.png`   | `13-create-custom-early-warning.png`          | Custom warning proposal and review     |

The source capture manifest identifies these as portfolio demonstrations that
combine saved app data with synthetic telemetry, charts, and trip summaries.
The warning conversation is simulated. They do not document an actual drive,
diagnosis, model response, warning installation, or service action. Gallery
captions preserve those distinctions. Original file hashes were verified before
copying. The public website does not connect to the vehicle or telemetry service.

## Fieldwork

- Local assets: `public/images/fieldwork-openings.png` (1440 × 1320) and
  `public/images/fieldwork-opening-detail.png` (1440 × 1050), plus
  `public/images/fieldwork-ask-codex.png`, `public/images/fieldwork-app-design.png`,
  and `public/images/fieldwork-agent-workspace.png` (each 1440 × 1080).
- Captured from Jacob's locally running Fieldwork app on 2026-09-20.
- The portfolio views use example company records and unsent research/design
  prompts. Private conversation history and unrelated controls are omitted.
- AI navigation and actual connection indicators are retained. These views show
  editable prompts, context selection, research, and design review.
- These are static captures; the public site does not connect to the workspace.
