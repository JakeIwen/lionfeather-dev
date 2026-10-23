import { writingScreenshots, type Screenshot } from './screenshots'

export type ArticleSlug = 'agent-sessions' | 'token-surplus'

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
  unlisted?: boolean
}

const agentSessions: Article = {
  slug: 'agent-sessions',
  title: 'Preventing a half-dozen LLM sessions from wrecking your codebase',
  dek: 'The rules, hooks and handoff conventions that let Claude Code and Codex work on the same repositories at once without the code decaying.',
  published: '2026-10-21',
  tags: ['Claude Code', 'Codex', 'Multi-agent workflows', 'Code quality'],
  blocks: [
    {
      kind: 'paragraph',
      text: "An agent helped me reverse-engineer my van's CAN bus and make a fix nobody had done before ([van telemetry](/work/van-telemetry)). After that I wanted to see how far it could go, and being between jobs turned out to be the time to find out.",
    },
    {
      kind: 'paragraph',
      text: "From late August to late October 2026 I had far more model capacity than I could normally justify ([how that happened](/writing/token-surplus)), so I spent it on the environment my coding agents work in and on projects that had been sitting on a list for years ([additional work](/#additional-work)). What I wanted to learn was what an agent-heavy workflow needs to stay reliable when several sessions run at once.",
    },
    { kind: 'heading', text: 'How the work was split' },
    {
      kind: 'paragraph',
      text: 'Claude Code is the orchestrator: it plans, delegates, reviews, and commits. GPT models do most of the work. GPT-6 Astra takes hard bugs and judgment calls, and doubles as a second opinion from another model family; GPT-5.6 Sol takes well-specified work that still needs reasoning; GPT-5.6 Luna takes mechanical edits.',
    },
    {
      kind: 'paragraph',
      text: "The split followed capacity: my OpenAI allowance was two to four times my Claude plan's, and Claude only joined a month in. GPT-6 Astra can orchestrate as well.",
    },
    { kind: 'heading', text: 'Keeping many sessions workable' },
    {
      kind: 'paragraph',
      text: "Most of my rules exist to stop wasted turns. Every worker is pinned to a model, because a subagent that inherits its parent's model quietly runs on the most expensive one. Workers report once, when they finish, because each mid-run message wakes the orchestrator and costs it a full turn.",
    },
    {
      kind: 'paragraph',
      text: 'Claude and Codex share the same instructions and the same handoff convention: one `.agent/handoffs/<workstream>.md` file per workstream with the goal, decisions, finished work, and next step, deleted when the work ships. Either tool can resume where the other stopped.',
    },
    {
      kind: 'paragraph',
      text: "Tooling I built along the way restores every open session after a reboot, searches transcripts from both tools, maps each uncommitted file to the session that wrote it so parallel agents never commit each other's unfinished work, and [reports where the tokens go](https://github.com/JakeIwen/agent-usage-analytics). [LLM Switchboard](https://github.com/JakeIwen/llm-switchboard) manages every Claude and Codex session on both machines and keeps the important ones running so I can reach them from my phone.",
    },
    { kind: 'figure', image: writingScreenshots.switchboard },
    { kind: 'heading', text: 'Making agent-written code readable again' },
    {
      kind: 'paragraph',
      text: 'Left alone, agents add the next file beside the last one and extend whichever module the previous feature landed in. The code works, but a person can no longer find their way around it. A Stop hook now compares file and function sizes against a committed baseline and fails any turn that makes them worse, and the baseline only moves in a deliberate commit.',
    },
    {
      kind: 'paragraph',
      text: "Cleanup ran as ordinary refactors: an audit, ranked tickets, one worktree per ticket, GPT implementing and Claude reviewing, and old/new output compared before anything merged. The big files got split into feature modules, the flat folders got sorted, and the pass caught hacky stuff I'd let slide for years, like a package held together by `sys.path` edits.",
    },
    {
      kind: 'paragraph',
      text: "A set of layout rules keeps it from drifting back. Entry points only parse arguments and call one function. Decision code stays free of clocks, sockets, files, and subprocesses, and each external system gets one adapter named after it. Formerly flat directories had feature-folder trees constructed semantically by filename, and there are no `utils` or `helpers` folders. Paths that systemd, launchd, or cron call are listed in each repository's AGENTS.md and checked against the real unit files, and moving one leaves a shim that says when it can be removed.",
    },
    {
      kind: 'paragraph',
      text: "Write your rules into AGENTS.md and CLAUDE.md first. Mine are public at [agent-env](https://github.com/JakeIwen/agent-env). The environment is done enough, and my time goes back into building software, now twice as robust at 5x the pace. I'm looking for contract or full-time work doing exactly this. [Get in touch](/#contact).",
    },
  ],
}

const tokenSurplus: Article = {
  slug: 'token-surplus',
  title: 'An Extraordinary Burn: Saving Surplus Usage from Being Returned to OpenAI',
  dek: 'Why I run a plan on each side, what two months of surplus tokens went to, and what the token count does and does not tell you.',
  published: '2026-10-22',
  tags: ['Codex', 'Claude Code', 'Plans and usage'],
  blocks: [
    {
      kind: 'paragraph',
      text: "Until November 2026, OpenAI's $200 Pro plan gives about four times the usage of its $100 plan, so spending $100 with each company buys noticeably less than $200 with one. With that 20x plan about to be cut back, the arithmetic flips: a plan on each side becomes the clear choice, with the added value of frontier models reviewing each other's work.",
    },
    {
      kind: 'paragraph',
      text: "Regardless, I had accumulated four OpenAI usage resets and meant to cash them in at the 20x rate. The allowance would have expired unused, so I spent it on two things: the environment my coding agents work in ([the rules and tooling that came out of it](/writing/agent-sessions)), and personal projects that had been sitting on a list for years ([additional work](/#additional-work)). I also added the Claude 5x plan early, so I could configure and experiment with its environment in tandem.",
    },
    { kind: 'heading', text: 'What the tokens went to' },
    {
      kind: 'paragraph',
      text: "The first weeks went to learning what the environment needed, mostly by watching several sessions fail in the same ways: a subagent inheriting the most expensive model, workers interrupting the orchestrator mid-run, two tools committing each other's half-finished work. Each failure became a rule in the shared instruction files, which are public at [agent-env](https://github.com/JakeIwen/agent-env).",
    },
    {
      kind: 'paragraph',
      text: "The harness came next, the small things that make a day of agent work cheaper. A `/rm` command deletes a throwaway conversation's transcript on exit so it never pollutes search or restore. One-word `+` commands such as `+ir`, `+le` and `+cp` are defined once and answered the same way by both tools, and a hook answers the bare listing without a model turn. Sessions come back after a reboot, and transcripts from both tools are searchable in one place. Setting up a new machine or a new model is now a config session that reads one file.",
    },
    {
      kind: 'paragraph',
      text: "Code from my first stretch with LLMs, written before any rules existed, had the shape you'd expect: files that grew wherever the last feature landed, helpers copied because nobody knew one existed, a package held together by `sys.path` edits. Cleaning it up was the expensive part. It ran as ordinary refactors, an audit and ranked tickets, one worktree per ticket, GPT implementing and Claude reviewing, old/new output compared before anything merged, and it only had to happen once: the Stop hook that compares every turn against a size baseline keeps it from growing back.",
    },
    { kind: 'heading', text: 'What the token count means' },
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
      ],
    },
    {
      kind: 'paragraph',
      text: 'The token figure is mostly cached input. Each turn of an agent loop re-sends a conversation the provider has already cached, so raw counts say little about how hard a plan is being used. In the week I ran 3.5 billion tokens through Codex CLI, 97% of them cached, my weekly limit peaked at 26%. In October I reached the limit repeatedly on 2 to 2.5 billion tokens a week.',
    },
    { kind: 'figure', image: writingScreenshots.tokensPerWeek },
    {
      kind: 'paragraph',
      text: "Codex sub-agents forked from a thread copy the parent's running token total into their own logs, so my first tally counted 3.4 billion tokens that were never used ([a known Codex logging quirk](https://github.com/openai/codex/issues/35463)). Codex logs its own limit percentages, and those turned out to be the only numbers worth trusting.",
    },
    {
      kind: 'paragraph',
      text: "Knowing where the tokens go is not a skill anyone hires for. It mattered here because the surplus was real and expiring, and because the plan limits, not the token totals, decide when the work stops. The surplus is spent, the environment is set, and the next allowance goes to building things with it.",
    },
  ],
}

export const articles: Article[] = [agentSessions, tokenSurplus]
