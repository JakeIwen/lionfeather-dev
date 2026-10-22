import { writingScreenshots, type Screenshot } from './screenshots'

export type ArticleSlug = 'token-surplus'

// Inline text in paragraphs, list items and table cells: **bold**, `code`, and
// [label](href). An href starting with / is a route on this site.
export type ArticleBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; ordered?: boolean; items: string[] }
  | { kind: 'table'; caption: string; columns: string[]; rows: string[][] }
  | { kind: 'figure'; image: Screenshot }

export type ArticleBlockKind = ArticleBlock['kind']

export type Article = {
  slug: ArticleSlug
  title: string
  // One sentence under the title and on the homepage card.
  dek: string
  // ISO date, shown as the publication date.
  published: string
  tags: string[]
  blocks: ArticleBlock[]
}

const tokenSurplus: Article = {
  slug: 'token-surplus',
  title: 'Five years of project ideas in two months',
  dek: 'How I used an enormous LLM token surplus to refine my coding environment and build the personal projects I had put off for years.',
  published: '2026-10-21',
  tags: ['Claude Code', 'Codex', 'Multi-agent workflows', 'Code quality'],
  blocks: [
    {
      kind: 'paragraph',
      text: 'From late August to late October 2026 I had far more model capacity than I could normally justify: a ChatGPT Pro plan, several banked usage resets on top of it, and, for the final month, a Claude plan as well. The allowance would have expired unused, so I spent it on two things: the environment my coding agents work in, and personal projects that had been sitting on a list for years.',
    },
    {
      kind: 'paragraph',
      text: "It was not the most token-efficient way to work, and I don't think it needed to be. What I wanted to learn was what an agent-heavy workflow needs to stay reliable when several sessions run at once. This is what worked for me, not a recipe.",
    },
    { kind: 'heading', text: "What the numbers say, and what they don't" },
    {
      kind: 'table',
      caption: '22 August to 21 October 2026, across my Mac and Raspberry Pi',
      columns: ['Measure', 'Result'],
      rows: [
        [
          'Commits',
          '1,255 across 17 repositories, 65% co-authored by an agent',
        ],
        [
          'Tokens',
          '18.3 billion: 12.9 billion on OpenAI models and 5.5 billion on Claude, which I used only in the final month',
        ],
        ['Subagents', '711 spawned, 137 of them inside scripted workflows'],
        [
          'Busiest day',
          '1.9 billion tokens, from one Codex thread building my van dashboard with 13 sub-agents',
        ],
        ['Weekly limit', 'Reached 100% on 7 days, plus 4 banked resets'],
      ],
    },
    {
      kind: 'paragraph',
      text: 'The token figure is mostly cached input. Each turn of an agent loop re-sends a conversation the provider has already cached, so raw counts say little about how hard a plan is being used. In the week I ran 3.5 billion tokens through Codex CLI, 97% of them cached, my weekly limit peaked at 26%. In October I reached the limit repeatedly on 2 to 2.5 billion tokens a week.',
    },
    { kind: 'figure', image: writingScreenshots.tokensPerWeek },
    {
      kind: 'paragraph',
      text: "I also got my own count wrong before publishing. Codex sub-agents forked from a thread copy the parent's running token total, so adding up session logs counted 3.4 billion tokens that were never used. Codex logs its own limit percentages, and those turned out to be the only numbers worth trusting.",
    },
    { kind: 'heading', text: 'How the work was split' },
    {
      kind: 'paragraph',
      text: 'Claude Code is the orchestrator: it plans, delegates, reviews, and commits. GPT models do most of the work. GPT-6 Astra takes hard bugs and judgment calls, and doubles as a second opinion from another model family; GPT-5.6 Sol takes well-specified work that still needs reasoning; GPT-5.6 Luna takes mechanical edits.',
    },
    {
      kind: 'paragraph',
      text: "That split followed capacity rather than preference: my OpenAI allowance was two to four times my Claude plan's, and Claude only joined a month in. Nothing about the arrangement requires Claude; GPT-6 Astra can orchestrate as well.",
    },
    { kind: 'heading', text: 'Keeping many sessions workable' },
    {
      kind: 'paragraph',
      text: "Most of my rules exist to stop wasted turns. Every worker is pinned to a model, because a subagent that inherits its parent's model quietly runs on the most expensive one. Workers report once, when they finish, because each mid-run message wakes the orchestrator and costs it a full turn. My phone alerts me only when a session is waiting on a permission or a question, never when a turn ends, which is what makes ten or more parallel sessions manageable.",
    },
    {
      kind: 'paragraph',
      text: 'Claude and Codex share the same instructions and the same handoff convention: one `.agent/handoffs/<workstream>.md` file per workstream with the goal, decisions, finished work, and next step, deleted when the work ships. Either tool can resume where the other stopped. Short commands such as `+ir` (investigate, fix the root cause, verify) and `+le` (list loose ends) are defined once and behave the same in both.',
    },
    {
      kind: 'paragraph',
      text: "The rest is tooling I built along the way: restoring every open session after a reboot, searching transcripts from both tools, compressing shell output before it reaches the context window, and mapping each uncommitted file to the session that wrote it so parallel agents never commit each other's unfinished work. LLM Switchboard lists every Claude and Codex session on both machines and keeps the important ones running so I can reach them from my phone.",
    },
    { kind: 'figure', image: writingScreenshots.switchboard },
    { kind: 'heading', text: 'Making agent-written code readable again' },
    {
      kind: 'paragraph',
      text: 'Left alone, agents add the next file beside the last one and extend whichever module the previous feature landed in. The code works, but a person can no longer find their way around it. A Stop hook now compares file and function sizes against a committed baseline and fails any turn that makes them worse, and the baseline only moves in a deliberate commit. In my largest repository, Python functions over 80 lines went from 85 to 47 and files over 800 lines from 24 to 13 while the code grew by 29%.',
    },
    {
      kind: 'paragraph',
      text: 'Cleanup ran as ordinary refactors: an audit, ranked tickets, one worktree per ticket, GPT implementing and Claude reviewing, and a comparison of old and new output before anything merged. Some of the results:',
    },
    {
      kind: 'list',
      items: [
        'The [Fieldwork](/work/fieldwork) server folder had 169 files at one level. A pass on 21 October moved its Gmail, autofill, careers, agent-session, and job-import code into feature folders, leaving 114 for the next pass.',
        'A video library of two files (3,469 and 3,037 lines) became 13 modules, and a 3,215-line system monitor became 9.',
        'A 1,551-line Wi-Fi manager became a 193-line dispatcher and 8 modules, with 64 functions byte-identical and no output differences across 56 scenarios.',
        'The [van telemetry](/work/van-telemetry) code went from 64 `sys.path` edits to none once it became a proper package, and its refactor replayed 882 guarded command paths.',
      ],
    },
    {
      kind: 'paragraph',
      text: "A set of layout rules keeps it from drifting back. Entry points only parse arguments and call one function. Decision code stays free of clocks, sockets, files, and subprocesses, and each external system gets one adapter named after it. Three or more files sharing a prefix become a feature folder, so `radar_alignment.py` becomes `radar/alignment.py`, and there are no `utils` or `helpers` folders. Paths that systemd, launchd, or cron call are listed in each repository's AGENTS.md and checked against the real unit files, and moving one leaves a shim that says when it can be removed.",
    },
    { kind: 'heading', text: 'What it built' },
    {
      kind: 'list',
      items: [
        '[Fieldwork](/work/fieldwork): a job-search workbench that keeps company research, openings, application status, and tailored resume and cover-letter PDFs in one place, and prefills applications without submitting them.',
        '[Van telemetry](/work/van-telemetry): CAN bus signal discovery for my 2022 Ram ProMaster, a Python telemetry broker, and a tablet dashboard with early warnings and tire-pressure trends ([source](https://github.com/JakeIwen/obd-things)).',
        '[Van dashboard](/work/van-dashboard): one screen for backups, network, media, lights, and compute, including door locking over the local network or a Starlink uplink ([source](https://github.com/JakeIwen/scripts/tree/master/pi/apps/van_dashboard)).',
        '[Compute broker](https://github.com/JakeIwen/van-compute): the Raspberry Pi hands heavy jobs to my MacBook, which runs them in sandboxes with no network access.',
        'LLM Switchboard: the session console above, built in 52 commits over 8 days.',
        'An electronics inventory: photograph a part, let a model draft the record, and search the collection offline.',
        '[Critter generator](https://github.com/JakeIwen/critter-generator): invents creatures with portraits, field notes, and a 3D-printable STL.',
        '[Backup safety](https://github.com/JakeIwen/scripts/tree/master/pi/scripts/backup): transactional backups with locks, fences, and rollback.',
        '[This site](https://github.com/JakeIwen/lionfeather-dev), and a small Hetzner server where one `edge.json` registry generates the Cloudflare Tunnel routes and DNS for the other apps I host, each behind its own access policy.',
        'Smaller pieces: a health journal with trend charts, a [YouTube cast receiver](https://github.com/JakeIwen/scripts/tree/master/pi/projects/youtube-cast), [media tools](https://github.com/JakeIwen/mac-media-tools), and a [set of Mac automations](https://github.com/JakeIwen/scripts/tree/master/macbook).',
      ],
    },
    {
      kind: 'paragraph',
      text: "If you have capacity to spend, write your rules into AGENTS.md and CLAUDE.md first; whatever model you use next inherits them. I'm happy to share the rule files and prompts behind any of this.",
    },
  ],
}

export const articles: Article[] = [tokenSurplus]
