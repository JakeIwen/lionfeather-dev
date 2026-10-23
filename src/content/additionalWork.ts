export type AdditionalWorkItem = {
  title: string
  summary: string
  href?: string
}

export const additionalWork: AdditionalWorkItem[] = [
  {
    title: 'agent-env',
    summary:
      'The rules, hooks and skills my coding agents run under, and the conventions that let Claude Code and Codex share a repo.',
    href: 'https://github.com/JakeIwen/agent-env',
  },
  {
    title: 'Usage analytics',
    summary:
      'Read-only reports on where Claude Code and Codex tokens go, built from the logs the tools already keep.',
    href: 'https://github.com/JakeIwen/agent-usage-analytics',
  },
  {
    title: 'LLM Switchboard',
    summary:
      'Lists every Claude and Codex session on both of my machines and keeps the important ones running so I can reach them from my phone.',
    href: 'https://github.com/JakeIwen/llm-switchboard',
  },
  {
    title: 'Compute broker',
    summary:
      'The Raspberry Pi hands heavy jobs to my MacBook, which runs them in sandboxes with no network access.',
    href: 'https://github.com/JakeIwen/van-compute',
  },
  {
    title: 'Backup safety',
    summary: 'Transactional backups with locks, fences, and rollback.',
    href: 'https://github.com/JakeIwen/scripts/tree/master/pi/scripts/backup',
  },
  {
    title: 'Critter generator',
    summary:
      'Invents creatures with portraits, field notes, and a 3D-printable STL.',
    href: 'https://github.com/JakeIwen/critter-generator',
  },
  {
    title: 'Electronics inventory',
    summary:
      'Photograph a part, let a model draft the record, and search the collection offline.',
  },
  {
    title: 'This site',
    summary:
      'Plus a small server where one registry generates the Cloudflare Tunnel routes and DNS for the other apps I host, each behind its own access policy.',
    href: 'https://github.com/JakeIwen/lionfeather-dev',
  },
  {
    title: 'YouTube cast receiver',
    summary: "A cast target for the van's screen.",
    href: 'https://github.com/JakeIwen/scripts/tree/master/pi/projects/youtube-cast',
  },
  {
    title: 'Media tools',
    summary: 'Mac tooling for the media library.',
    href: 'https://github.com/JakeIwen/mac-media-tools',
  },
  {
    title: 'Mac automations',
    summary: 'A set of small automations for daily use.',
    href: 'https://github.com/JakeIwen/scripts/tree/master/macbook',
  },
  {
    title: 'Health journal',
    summary: 'Trend charts over a daily log.',
  },
]
