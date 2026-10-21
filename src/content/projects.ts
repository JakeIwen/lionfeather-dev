export type ProjectSlug =
  | 'van-dashboard'
  | 'form-engine'
  | 'production-pipelines'
  | 'fieldwork'
  | 'van-telemetry'

export type Project = {
  slug: ProjectSlug
  title: string
  subtitle: string
  category: string
  period: string
  tags: string[]
  // Blank lines separate paragraphs; **text** renders bold.
  intro: string
  role: string
  sections: { title: string; paragraphs: string[] }[]
}

export const projects: Project[] = [
  {
    slug: 'van-dashboard',
    title: 'A dashboard for a home on wheels.',
    subtitle: 'One interface for the systems I use every day.',
    category: 'PERSONAL PROJECT',
    period: 'Ongoing',
    tags: ['React', 'TypeScript', 'Python', 'Raspberry Pi'],
    intro:
      'I live in a converted campervan. Its network, storage, backups, lighting, and media services are connected through a Raspberry Pi and an OpenWrt router. I built a browser dashboard with coding-agent assistance under my direction and review to see what is happening and control those systems from one place.',
    role: 'Design, frontend, backend, and system integration',
    sections: [
      {
        title: 'An interface to physical systems',
        paragraphs: [
          'The dashboard brings together systems with very different behavior: a light responds quickly, a backup can run for hours, and switching a network connection can interrupt the request that initiated it. The interface needs to account for those differences.',
          'The React and TypeScript frontend groups the controls by system, and a Python/Flask backend owns the device and service controllers. The browser is a client of that backend and holds no independently authoritative device state.',
        ],
      },
      {
        title: 'Working with imperfect connections',
        paragraphs: [
          'Polling runs one request at a time, so slow responses cannot pile up, and it pauses while the page is hidden. If a refresh fails, the interface keeps showing the last valid data.',
          'Control failures need different handling from read failures. A timeout does not prove that a device ignored a command, so after a failed action the interface asks the backend for the current state instead of retrying a command that may already have taken effect.',
        ],
      },
      {
        title: 'The systems behind the screen',
        paragraphs: [
          "The dashboard sits on top of systems I operate every day: automated backups; cellular, satellite, and directional Wi-Fi connectivity; and storage protection that responds to the vehicle's ignition state.",
        ],
      },
    ],
  },
  {
    slug: 'form-engine',
    title: 'Form Engine',
    subtitle:
      'Turns existing documents into fillable web forms and generates pixel-accurate PDFs from the results.',
    category: 'PRODUCTION SOFTWARE',
    period: '2018-2026',
    tags: ['TypeScript', 'Firebase', 'Puppeteer', 'AngularJS'],
    intro:
      'Form Engine turns existing documents into fillable web forms and generates pixel-accurate PDFs from the results. I was one of three core engineers on the product for eight years at Advantage Integrated Solutions.',
    role: 'Core product engineer; form builder and PDF platform ownership',
    sections: [
      {
        title: 'Keeping the original document useful',
        paragraphs: [
          'Many business processes depend on a particular document layout. Digitizing the process still has to produce the form people expect to receive, print, or sign. I built the form-builder core during the initial buildout and owned the Puppeteer-based PDF platform.',
          "The work crossed template editing, signature capture, fonts, render timing, and the final PDF. The requirement was to preserve the document's layout through those steps, not replace it with a generic web form.",
        ],
      },
      {
        title: 'Sending only what the endpoint needs',
        paragraphs: [
          "One API path serialized the full in-memory form template even though the endpoint needed only routing identifiers. I replaced that request with an endpoint-specific payload rather than keep sending the browser's full object. In one representative throttled Fast 3G test, the POST shrank from 375 KB to 370 bytes and a roughly four-to-five-second upload dropped to milliseconds.",
          'Separately, I changed template loading to return document-asset links instead of embedded base64 bodies, fetching the bytes explicitly when needed. Development benchmarks showed roughly halved page-load and template-fetch times. Those were measured development results; a separate bundle optimization reduced JavaScript size by about 25%.',
        ],
      },
      {
        title: 'Maintaining the product as its dependencies changed',
        paragraphs: [
          "I led the Node.js 14 and 22 runtime migrations and implemented the move of record, report, and file operations from Quickbase's legacy XML API to its JSON REST API. I also independently built a healthcare EDI module for claim generation and remittance processing.",
          'In 2026, I built LLM-based form-template generation using MCP tools and the OpenAI Agents SDK, with transaction logging for auditability.',
        ],
      },
    ],
  },
  {
    slug: 'production-pipelines',
    title: 'Workforce integration platform',
    subtitle:
      'Scheduled SFTP and spreadsheet jobs between workforce applications and state and county agencies for BrightSpring/ResCare.',
    category: 'DATA & INFRASTRUCTURE',
    period: '2018-2026',
    tags: ['Ruby', 'AWS', 'SFTP', 'Quickbase'],
    intro:
      "I was the long-term primary contributor to BrightSpring/ResCare's background-job platform, which carried data between workforce applications and state and county agencies. It ran more than 50 jobs across roughly 30 active schedules.",
    role: 'Integration development and platform maintenance',
    sections: [
      {
        title: 'Business processes carried in files',
        paragraphs: [
          'The integrations moved data as files, over SFTP and in Excel or CSV spreadsheets, each shaped by the requirements of a particular agency or regional application. Maintaining the platform meant understanding those workflows as well as the code that transformed and transferred the data.',
        ],
      },
      {
        title: 'Replacing the servers underneath the jobs',
        paragraphs: [
          'One history was the ResCare-Apps script server, which dated to 2012. Over seven years I maintained that code while removing more of it than I added. Its surviving jobs were moved to the successor repository before I decommissioned that server in 2025.',
          "Separately, I led the background-job platform's Ruby 2.4 upgrade in 2019. In 2025 I independently moved that platform to a new Amazon Linux 2023 server and Ruby 3.3, and wrote its migration runbook and new cron schedule.",
        ],
      },
      {
        title: 'Part of a broader production responsibility',
        paragraphs: [
          'Alongside this platform, I maintained customer-facing portals, document systems, database archives, and AWS infrastructure. That included runtime upgrades, RDS migrations, backups, certificate rollout tooling, and monitoring.',
          'My long-term ownership of these systems included deployment and support.',
        ],
      },
    ],
  },
  {
    slug: 'fieldwork',
    title: 'Fieldwork',
    subtitle:
      'A personal application that keeps company research, job openings, application status, and document versions in one workspace.',
    category: 'PERSONAL APPLICATION',
    period: '2026',
    tags: ['React', 'TypeScript', 'Node.js', 'SQLite', 'Codex'],
    intro:
      'I built Fieldwork with coding-agent assistance to keep company research, job openings, application status, and document versions in one local workspace. I directed the product and interface, reviewed changes, and decided which results to rely on. The app connects to Codex for research and document work; it is a personal, single-user application.',
    role: 'Product direction, interface design, and full-stack development',
    sections: [
      {
        title: 'From a posting to a useful record',
        paragraphs: [
          'A saved job link on its own tells me little. I also need company context, location restrictions, compensation, dated sources, and the questions still worth asking. Fieldwork keeps those details with the opening instead of requiring me to reconstruct them at each step.',
          'The React interface lets me search and filter openings, compare roles, save views, and keep my notes beside the research. Company pages, openings, and application records link to one another without making imported research the authority over my application status.',
        ],
      },
      {
        title: 'Research assistance, with a review step',
        paragraphs: [
          'I use Ask Codex to compare a role with my experience and investigate questions about the company. I review the supporting sources and decide which opportunities to pursue. Question and document tasks capture the current resume, evidence, and writing rules along with relevant opening context, rather than relying only on a free-form prompt.',
          'For document tasks, the agent works through defined source tools in an isolated draft. The backend runs the trusted PDF renderer and validators; the agent cannot make a draft authoritative just by saying it is finished. Recorded checks cover real source reads, revisions, PDF generation, and restart/resume.',
        ],
      },
      {
        title: 'Refreshing research without losing personal work',
        paragraphs: [
          'The Node.js backend stores personal records in SQLite, separately from imported Markdown and JSON research. I chose that separation so rebuilding the research index would not erase notes or change application status. Version-checked writes also reject an update from a stale browser tab.',
          'An incomplete scan is not proof that a role closed. Research retains its source and observation date, and missing evidence stays qualified. Replacing the general resume is a reviewed, hash-checked operation with recovery records.',
        ],
      },
      {
        title: 'Improving the app from inside the app',
        paragraphs: [
          'The App design workspace creates a separate client-interface preview without my private records. Before applying a change, I can inspect the changed files and the build and browser-check results. It covers client-interface changes.',
          'Apply checks that the source files still match the reviewed version and blocks the update if they changed. That is a separate decision from generating the proposal, with an undo copy retained for the applied change.',
        ],
      },
      {
        title: 'Keeping an accurate application history',
        paragraphs: [
          'Preparing documents and recording an application as sent are different actions. Fieldwork preserves the selected document bytes as immutable copies instead of keeping only paths to files I might later edit. The tracker records my actions; it does not establish that an employer received an application.',
          'The browser and Express server run locally, and backups include the database and preserved document objects. Research and document tasks send their captured context to Codex. The screenshots show example records and unsent prompts.',
        ],
      },
    ],
  },
  {
    slug: 'van-telemetry',
    title: 'Van telemetry dashboard',
    subtitle:
      'Signal discovery and mapping, a Python telemetry broker, and a dashboard built for a portrait tablet.',
    category: 'AUTOMOTIVE SOFTWARE',
    period: '2026',
    tags: ['Python', 'SocketCAN', 'CAN / UDS', 'Preact', 'SQLite'],
    intro:
      'I developed a telemetry system for my 2022 Ram ProMaster with coding-agent assistance under my direction and review. Investigating CAN bus signals and building a Python data broker gave me the data to show live readings and trends in a tablet web app: gauges, parked battery status, trip history, and an evidence-based warning system.\n\nThe same CAN work produced one guarded control action: an authorized single action frame unlocks the front doors, though wake traffic may precede it.',
    role: 'Signal research, acquisition tooling, backend, and dashboard development',
    sections: [
      {
        title: 'The meaning behind the bytes',
        paragraphs: [
          'The useful work started before decoding any traffic: reviewing service information, existing findings, and diagnostic-tool behavior for the modules actually installed in the van. Definitions from related vehicles were leads to investigate, not proof that this vehicle used the same encoding.',
          'I recorded CAN traffic while AlfaOBD, a diagnostic app, collected labeled readings, then linked each reading back to its exact request and response frames in the capture. That gave the two data sets a common clock even when the tablet and the capture computer disagreed about the time.',
          'Python tooling then searched for candidate fields, testing byte order, signedness, scale, offset, and packed-bit layouts that cross byte boundaries.',
        ],
      },
      {
        title: 'Mapping signals through correlation and tiered evidence',
        paragraphs: [
          "Engine speed was a clear positive result. A two-byte field in broadcast frame 0x0FC matched the engine computer's RPM reading at a quarter scale across a loaded drive. With the earlier idle analysis, that was enough to publish RPM from passive broadcasts alone.",
          'Other candidates failed the harder checks. One torque-related field tracked the reference torque reading under load, but the relationship changed during lift-off and overrun, so it stayed a candidate rather than being presented as engine torque.',
          'The validation tooling kept the data used to discover a mapping separate from the independent drives used to test it, and a mapping needed support for its physical meaning, not just a numerical fit. Each value records its evidence tier: verified, matched to a scan-tool scale, derived, or still an estimate.',
        ],
      },
      {
        title: 'Keeping acquisition separate from the interface',
        paragraphs: [
          "A Python broker owns all access to the vehicle buses and exposes an approved set of metrics. Readings such as RPM, coolant temperature, oil pressure, and voltage come from passive broadcasts. Measurements that still need a diagnostic request go through explicitly allowed paths that check the vehicle's state and bus ownership first.",
          "The web layer reads only the broker's cache; opening a page or receiving a stream update does not by itself trigger a read from the CAN bus. Each reading carries its source, quality, and age, and the client accounts for delivery delays and reconnections before treating a value as current.",
        ],
      },
      {
        title: 'A dashboard for the tablet already in the van',
        paragraphs: [
          'I designed the Preact interface around an older tablet mounted in portrait. The driving view keeps the main gauges on one screen with large numerals and restrained color, and the Parked, Health, History, and System views hold the detail that would crowd it.',
          'Server-sent events carry small updates to the current state, while the larger history and health summaries refresh separately. Preact signals push only the slices that changed, so the interface does not rebuild every panel on every update. A stale or last-recorded value stays visibly distinct from a live reading.',
        ],
      },
      {
        title: 'Warnings that preserve their evidence',
        paragraphs: [
          'A SQLite-backed historian records the measurements behind trends and warning events. When a warning fires, its event view preserves the opening readings, comparison baselines, and the timeline, so I can see why it appeared instead of trusting a status badge.',
          "The dashboard also has an advisor built on Codex, OpenAI's agent. It can talk through a saved event or propose a warning rule limited to numeric thresholds; I review every setting before the rule is saved, and the advisor has no tools that touch the CAN bus or the services. The screenshots show illustrative telemetry and warning scenarios, including a simulated conversation, not evidence of a particular drive or diagnosis.",
        ],
      },
    ],
  },
]
