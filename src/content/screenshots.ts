export type Screenshot = {
  id: string
  label: string
  src: string
  width: number
  height: number
  context: string
  alt: string
}

export const dashboardScreenshot: Screenshot = {
  id: 'dashboard',
  label: 'Van dashboard',
  src: '/images/van-dashboard.png',
  width: 2236,
  height: 1710,
  context: 'Van dashboard',
  alt: 'Van dashboard showing networking, system health, storage, lighting, backups, media, and vehicle controls in a dark tile layout.',
}

export const formEngineImage = {
  src: '/images/form-engine-portal.png',
  alt: 'Form Engine vendor intake and self-service portal displayed on a laptop and phone.',
  width: 1500,
  height: 1170,
}

export const fieldworkScreenshots = {
  openings: {
    label: 'Openings & filters',
    src: '/images/fieldwork-openings.png',
    width: 1440,
    height: 1320,
    context: 'Example records',
    alt: 'Fieldwork openings workspace with company, role, fit, priority, compensation, and saved-view filters. Example records are shown.',
  },
  detail: {
    label: 'Role details',
    src: '/images/fieldwork-opening-detail.png',
    width: 1440,
    height: 1050,
    context: 'Example records',
    alt: 'Fieldwork showing an opening beside its research, technical fit, remote eligibility, and compensation. Example records are shown.',
  },
  research: {
    label: 'Ask Codex',
    src: '/images/fieldwork-ask-codex.png',
    width: 1440,
    height: 1080,
    context: 'Example research prompt',
    alt: 'Ask Codex connected to an existing account, with an editable prompt asking for role-fit research, gaps, and facts to verify before deciding whether to apply.',
  },
  design: {
    label: 'App design',
    src: '/images/fieldwork-app-design.png',
    width: 1440,
    height: 1080,
    context: 'Example design request',
    alt: 'Fieldwork App design with an editable interface-change request and a separate preview and review panel before applying changes.',
  },
  agents: {
    label: 'Agent workspace',
    src: '/images/fieldwork-agent-workspace.png',
    width: 1440,
    height: 1080,
    context: 'Example review setup',
    alt: 'Fieldwork Agent workspace showing connected Codex, research tasks, an editable role-review prompt, and explicit context selection.',
  },
}

export type FieldworkScreen = keyof typeof fieldworkScreenshots

const telemetryPath = '/images/van-telemetry/'
export const telemetryScreenshots: Screenshot[] = [
  {
    id: 'drive',
    label: 'Driving gauges',
    src: `${telemetryPath}drive.png`,
    width: 800,
    height: 1280,
    context: 'Portrait tablet gauges · Illustrative demo telemetry',
    alt: 'Van telemetry driving view with large speed and RPM gauges, temperatures, oil pressure, voltage, power, tires, and trip information. Illustrative demo data.',
  },
  {
    id: 'parked',
    label: 'Parked overview',
    src: `${telemetryPath}parked.png`,
    width: 800,
    height: 1280,
    context:
      'Battery, tires, and service history · Illustrative demo telemetry',
    alt: 'Parked telemetry view showing battery voltage and trend, tire pressures, service records, and a warning summary. Illustrative demo data.',
  },
  {
    id: 'evidence',
    label: 'Warning evidence',
    src: `${telemetryPath}warning-evidence.png`,
    width: 800,
    height: 1280,
    context:
      'Saved readings and event timeline · Illustrative warning scenario',
    alt: 'A warning detail view preserves opening readings, a comparison baseline, a chart, and an event timeline. Illustrative slow-leak scenario.',
  },
  {
    id: 'history',
    label: 'Trip history',
    src: `${telemetryPath}history.png`,
    width: 800,
    height: 1280,
    context: 'Trips and temperature trends · Illustrative demo history',
    alt: 'Trip summaries and temperature charts in the telemetry history view. The trip statistics and plotted readings are illustrative demo data.',
  },
  {
    id: 'catalog',
    label: 'Metric sources',
    src: `${telemetryPath}metric-catalog.png`,
    width: 800,
    height: 1280,
    context:
      'Source, quality, and freshness policies · Illustrative metric values',
    alt: 'The telemetry metric catalog shows data sources, quality labels, and freshness policies alongside illustrative readings.',
  },
  {
    id: 'warnings',
    label: 'Warning review',
    src: `${telemetryPath}custom-warning.png`,
    width: 800,
    height: 1280,
    context:
      'Custom warning proposal · Simulated conversation; no rule installed',
    alt: 'A simulated Codex conversation proposes an early-warning rule with settings for the owner to review and approve. No vehicle action or warning installation occurred.',
  },
]
