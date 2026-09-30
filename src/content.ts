export const resumeUrl = '/Jacob-Iwen-Resume.pdf'
export const email = 'lionfeatherdev@gmail.com'

export type Project = {
  slug: string
  title: string
  subtitle: string
  category: string
  period: string
  tags: string[]
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
      'I live in a converted campervan. Its network, storage, backups, lighting, and media services are connected through a Raspberry Pi and an OpenWrt router. I built a browser dashboard to see what is happening and control those systems from one place.',
    role: 'Design, frontend, backend, and system integration',
    sections: [
      {
        title: 'An interface to physical systems',
        paragraphs: [
          'The dashboard brings together systems with very different behavior: a light responds quickly, a backup can run for hours, and switching a network connection can interrupt the request that initiated it. The interface needs to account for those differences.',
          'The React and TypeScript frontend organizes the controls by domain. A Python/Flask backend owns the device and service controllers, including networking, storage, backups, lighting, and Sonos. The browser is a client of that backend, rather than a second source of operational state.',
        ],
      },
      {
        title: 'Working with imperfect connections',
        paragraphs: [
          'Polling runs sequentially so a slow request cannot create a growing queue of overlapping requests. Ordinary polling pauses when the page is hidden, then refreshes when it becomes visible. If a refresh fails, the interface keeps the last valid data available.',
          'Control failures need different handling from read failures. A timeout does not prove that a device ignored a command. After a failed action, the interface refreshes the authoritative resource instead of automatically repeating an action that may already have happened.',
        ],
      },
      {
        title: 'The systems behind the screen',
        paragraphs: [
          'The broader setup includes automated backups, directional Wi-Fi and cellular connectivity, and storage protection that responds to the vehicle ignition state. These are systems I operate as part of daily life.',
          'The small demo below is an illustrative interface with simulated data. It lets you explore a few of the dashboard’s control patterns without connecting to the van.',
        ],
      },
    ],
  },
  {
    slug: 'form-engine',
    title: 'From a document to a working application.',
    subtitle: 'Eight years building a form-digitization platform.',
    category: 'PRODUCTION SOFTWARE',
    period: '2018–2026',
    tags: ['TypeScript', 'Firebase', 'Puppeteer', 'AngularJS'],
    intro:
      'Form Engine turns existing documents into fillable web forms and generates pixel-accurate PDFs from the results. I was one of three core engineers on the product for eight years at Advantage Integrated Solutions.',
    role: 'Core product engineer; form builder and PDF platform ownership',
    sections: [
      {
        title: 'Keeping the original document useful',
        paragraphs: [
          'Many business processes depend on a particular document layout. Digitizing the process still needs to produce the document people expect to receive, print, or sign. I built the form-builder core during the initial product buildout and owned the Puppeteer-based PDF generation platform.',
          'That work crossed the browser and backend: template editing, signature capture, fonts, rendering timing, and the final PDF output. The product supported data providers including Quickbase, ServiceNow, and Salesforce.',
        ],
      },
      {
        title: 'Sending only what the endpoint needs',
        paragraphs: [
          'One API path was serializing the full in-memory form template even though the endpoint needed only a small set of identifiers. I replaced that request with a compact, endpoint-specific payload, eliminating multi-second uploads in throttled Fast 3G tests.',
          'Separate template-loading work avoided returning embedded document assets when the caller only needed links. Development benchmarks showed roughly halved page-load and template-fetch times. Bundle optimization reduced JavaScript size by 25%. Those are separate measurements, rather than a single application-wide speedup.',
        ],
      },
      {
        title: 'Maintaining the product as its dependencies changed',
        paragraphs: [
          'Over the product’s life, I led Node.js runtime migrations and implemented a move from a legacy XML API to JSON REST endpoints. I also independently built a healthcare EDI module for claim generation and remittance processing.',
          'In 2026, I added LLM-based form-template generation using MCP tools and the OpenAI Agents SDK, with transaction logging for auditability.',
        ],
      },
    ],
  },
  {
    slug: 'production-pipelines',
    title: 'Keeping the data moving.',
    subtitle: 'Production integrations, maintained over years.',
    category: 'DATA & INFRASTRUCTURE',
    period: '2018–2026',
    tags: ['Ruby', 'AWS', 'SFTP', 'Quickbase'],
    intro:
      'As a long-term primary contributor to BrightSpring/ResCare’s background-job platform, I maintained integrations between workforce applications and state and county agencies. The platform ran more than 50 jobs across roughly 30 active schedules.',
    role: 'Primary contributor, integration development, and platform maintenance',
    sections: [
      {
        title: 'Business processes carried in files',
        paragraphs: [
          'The integrations moved data through SFTP and Excel/CSV pipelines. Each connection reflected the requirements of a particular agency or regional application. Maintaining the platform meant understanding those workflows as well as the code that transformed and transferred the data.',
        ],
      },
      {
        title: 'Moving the platform forward',
        paragraphs: [
          'I independently migrated the server to Amazon Linux 2023 and upgraded the codebase to Ruby 3.3. The migration included the runbook and schedule configuration needed to move the existing jobs to the new environment.',
          'When Quickbase enforced two-factor authentication, I built Firebase-backed authentication-ticket renewal so the integrations could continue authenticating. Changes at a provider’s boundary became application and infrastructure work inside our own systems.',
        ],
      },
      {
        title: 'Part of a broader production responsibility',
        paragraphs: [
          'Alongside this platform, I maintained customer-facing portals, document systems, database archives, and AWS infrastructure. That included runtime upgrades, RDS migrations, backups, certificate rollout tooling, and monitoring.',
          'These systems were maintained over years as client requirements and their dependencies changed. The responsibility extended from making a change through deploying and supporting it.',
        ],
      },
    ],
  },
  {
    slug: 'fieldwork',
    title: 'Fieldwork: a workspace for the search.',
    subtitle:
      'Company research, opportunities, and application history in one place.',
    category: 'PERSONAL APPLICATION',
    period: '2026',
    tags: ['React', 'TypeScript', 'Node.js', 'SQLite', 'Codex'],
    intro:
      'I built Fieldwork to keep company research, job openings, application status, and document versions in one local workspace. Its Codex integration helps me investigate opportunities and review the evidence behind a decision.',
    role: 'Product direction, interface design, and full-stack development',
    sections: [
      {
        title: 'From a posting to a useful record',
        paragraphs: [
          'A saved job link is only the beginning. I also need the company context, location requirements, compensation, the date the posting was checked, and the questions that still need an answer. Fieldwork brings those details together on the opening.',
          'The React interface supports searching, filtering, comparing roles, saving views, and keeping notes beside the source-backed research. Company pages, openings, and application records are connected so the same context can be reused across the workflow.',
        ],
      },
      {
        title: 'Research assistance, with a review step',
        paragraphs: [
          'I use Ask Codex to compare a role with my experience, investigate company policies, and identify gaps worth following up on. I choose what to investigate, check the supporting sources, and decide which opportunities to pursue.',
          'The agent workspace connects to my existing Codex account. Each task starts with an editable prompt and explicit context, including the opening, company, and selected experience notes. Task history and connection status stay visible while I review the work.',
        ],
      },
      {
        title: 'Refreshing research without losing personal work',
        paragraphs: [
          'The TypeScript and Node.js backend stores personal records in SQLite, separately from imported research that can be rebuilt. Refreshing a posting should not erase a bookmark, replace a note, or move an application to a different status.',
          'Research retains its source and observation date. An incomplete scan does not prove a role has closed, so the app preserves that uncertainty. Version-checked writes help prevent an older browser view from overwriting newer personal changes.',
        ],
      },
      {
        title: 'Improving the app from inside the app',
        paragraphs: [
          'The App design workspace lets me describe an interface change and review it in a separate preview. I can inspect the changed files and the build and browser-check results before applying the change.',
          'That preview uses a separate environment with private application records excluded. Applying a reviewed change checks that the original source files still match; an intervening edit blocks the update instead of being overwritten.',
        ],
      },
      {
        title: 'Keeping an accurate application history',
        paragraphs: [
          'Preparing an application and submitting it are separate actions. Recording a submission captures the exact selected document versions as immutable copies, so a later file edit cannot change the record of what was sent.',
          'The browser connects to a local Express server, and the workspace stays on the machine. Backups include the database and preserved document objects. The screenshots use example records and unsent prompts to show the research, review, and design workflows.',
        ],
      },
    ],
  },
  {
    slug: 'van-telemetry',
    title: 'Van telemetry: from bus traffic to useful readings.',
    subtitle:
      'Signal discovery, a Python telemetry broker, and a dashboard built for a portrait tablet.',
    category: 'VEHICLE SOFTWARE',
    period: '2026',
    tags: ['Python', 'SocketCAN', 'CAN / UDS', 'Preact', 'SQLite'],
    intro:
      'I built a telemetry system for my 2022 Ram ProMaster, from investigating CAN-bus signals to collecting readings and displaying them on a tablet. It brings together driving gauges, parked battery status, trip history, and the evidence behind warnings.',
    role: 'Signal research, acquisition tooling, backend, and dashboard development',
    sections: [
      {
        title: 'Finding the meaning behind the bytes',
        paragraphs: [
          'The useful work started before decoding traffic: reviewing service information, existing findings, and diagnostic-tool behavior for the modules actually installed in the van. Definitions from related vehicles were leads to investigate, not proof that this vehicle used the same encoding.',
          'I recorded CAN traffic while AlfaOBD collected labeled diagnostic readings. Those readings were linked back to their exact request and response frames in the capture, giving the comparison a common timestamp. That mattered when the tablet and capture computer disagreed about the time.',
          'Python tooling searched candidate fields and tested byte order, signedness, packed-bit layouts, scale, and offset. The field engine could represent signals that crossed byte boundaries instead of assuming every reading occupied a whole byte or word.',
        ],
      },
      {
        title: 'A good correlation was only the beginning',
        paragraphs: [
          'Engine speed was a useful positive result. A two-byte field in broadcast frame 0x0FC matched the engine computer’s RPM reading at a quarter scale across a loaded drive. Together with the earlier idle work and field evidence, that supported a receive-only RPM source for the dashboard.',
          'Other candidates failed more demanding checks. One torque-related field tracked the reference under load, but its relationship changed during lift-off and overrun. It remained a candidate instead of being presented as actual engine torque.',
          'The validation tooling kept discovery and independent drive evidence separate. A mapping needed support for its physical meaning as well as a numerical fit. The project records whether a value is verified, follows an observed scan-tool scale, is derived, or remains an estimate.',
        ],
      },
      {
        title: 'Keeping acquisition separate from the interface',
        paragraphs: [
          'A Python broker owns access to the vehicle buses and exposes an approved set of metrics. Passive broadcasts supply readings such as RPM, coolant temperature, oil pressure, and voltage. Measurements that still need diagnostic requests use narrow, explicitly allowed paths with vehicle-state and bus-ownership checks.',
          'The web layer reads the broker’s cache. Opening a page or receiving a stream update does not itself trigger CAN acquisition. Each reading carries source, quality, and age information, and the client accounts for delivery delays and reconnections before treating it as current.',
        ],
      },
      {
        title: 'A dashboard for the tablet already in the van',
        paragraphs: [
          'The Preact interface was designed around an older, portrait-mounted tablet. The driving view keeps the main gauges on one screen with large numerals and restrained color. Parked, Health, History, and System views provide the detail that would crowd the driving screen.',
          'Server-sent events carry small current-state updates, while larger history and health summaries refresh separately. Preact signals publish changed slices so the interface does not rebuild every panel on every update. A stale or last-recorded value remains distinguishable from a live reading.',
        ],
      },
      {
        title: 'Warnings that preserve their evidence',
        paragraphs: [
          'A SQLite historian keeps the measurements behind trends and warning events. The event view preserves opening readings, comparison baselines, and the timeline, so I can inspect why a warning appeared rather than relying on a status badge.',
          'The Codex integration can discuss a saved event or propose a bounded warning rule. I review the settings before saving it; the advisor has no direct CAN or service-control tools. The screenshots show illustrative telemetry and warning scenarios, including a simulated conversation, rather than evidence of a particular drive or diagnosis.',
        ],
      },
    ],
  },
]
