export type AdditionalWorkItem = {
  // Stable key for the saved homepage order; keep it when the title changes.
  id: string
  title: string
  summary: string
  href?: string
}

export const additionalWork: AdditionalWorkItem[] = [
  {
    id: 'agent-env',
    title: 'agent-env',
    summary:
      'The rules, hooks and skills my coding agents run under, and the conventions that let Claude Code and Codex share a repo.',
    href: 'https://github.com/JakeIwen/agent-env',
  },
  {
    id: 'usage-analytics',
    title: 'Usage analytics',
    summary:
      'Read-only reports on where Claude Code and Codex tokens go, built from the logs the tools already keep.',
    href: 'https://github.com/JakeIwen/agent-usage-analytics',
  },
  {
    id: 'llm-switchboard',
    title: 'LLM Switchboard',
    summary:
      'Lists every Claude and Codex session on both of my machines and keeps the important ones running so I can reach them from my phone.',
    href: 'https://github.com/JakeIwen/llm-switchboard',
  },
  {
    id: 'compute-broker',
    title: 'Compute broker',
    summary:
      'The Raspberry Pi hands heavy jobs to my MacBook, which runs them in sandboxes with no network access.',
    href: 'https://github.com/JakeIwen/van-compute',
  },
  {
    id: 'backup-safety',
    title: 'Backup safety',
    summary: 'Transactional backups with locks, fences, and rollback.',
    href: 'https://github.com/JakeIwen/scripts/tree/master/pi/scripts/backup',
  },
  {
    id: 'critter-generator',
    title: 'Critter generator',
    summary:
      'Invents creatures with portraits, field notes, and a 3D-printable STL.',
    href: 'https://github.com/JakeIwen/critter-generator',
  },
  {
    id: 'electronics-inventory',
    title: 'Electronics inventory',
    summary:
      'Photograph a part, let a model draft the record, and search the collection offline.',
  },
  {
    id: 'this-site',
    title: 'This site',
    summary:
      'Plus a small server where one registry generates the Cloudflare Tunnel routes and DNS for the other apps I host, each behind its own access policy.',
    href: 'https://github.com/JakeIwen/lionfeather-dev',
  },
  {
    id: 'youtube-cast',
    title: 'YouTube cast receiver',
    summary: "A cast target for the van's screen.",
    href: 'https://github.com/JakeIwen/scripts/tree/master/pi/projects/youtube-cast',
  },
  {
    id: 'media-tools',
    title: 'Media tools',
    summary: 'Mac tooling for the media library.',
    href: 'https://github.com/JakeIwen/mac-media-tools',
  },
  {
    id: 'mac-automations',
    title: 'Mac automations',
    summary: 'A set of small automations for daily use.',
    href: 'https://github.com/JakeIwen/scripts/tree/master/macbook',
  },
  {
    id: 'health-journal',
    title: 'Health journal',
    summary: 'Trend charts over a daily log.',
  },
]
