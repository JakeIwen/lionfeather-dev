import ScreenshotCarousel from './ScreenshotCarousel'

const screens = {
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

type Screen = keyof typeof screens

export default function FieldworkPreview({
  screen = 'detail',
  loading = 'lazy',
}: {
  screen?: Screen
  loading?: 'lazy' | 'eager'
}) {
  const image = screens[screen]
  return (
    <img
      className="fieldwork-screenshot"
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      loading={loading}
      decoding="async"
    />
  )
}

export function FieldworkGallery() {
  return (
    <ScreenshotCarousel
      title="Fieldwork"
      id="fieldwork"
      images={Object.entries(screens).map(([id, image]) => ({ id, ...image }))}
      className="fieldwork-gallery"
    />
  )
}
