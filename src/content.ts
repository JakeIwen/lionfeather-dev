export const resumeUrl = '/Jacob-Iwen-Resume.pdf'
export const email = 'lionfeatherdev@gmail.com'

export type Project = {
  slug: string
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
      'I live in a converted campervan. Its network, storage, backups, lighting, and media services are connected through a Raspberry Pi and an OpenWrt router. I built a browser dashboard to see what is happening and control those systems from one place.',
    role: 'Design, frontend, backend, and system integration',
    sections: [
      {
        title: 'An interface to physical systems',
        paragraphs: [
          'The dashboard brings together systems with very different behavior: a light responds quickly, a backup can run for hours, and switching a network connection can interrupt the request that initiated it. The interface needs to account for those differences.',
          'The React and TypeScript frontend groups the controls by system. A Python/Flask backend owns the device and service controllers for networking, storage, backups, lighting, and Sonos. The browser is a client of that backend and does not keep its own copy of the device state.',
        ],
      },
      {
        title: 'Working with imperfect connections',
        paragraphs: [
          'Polling runs one request at a time, so a slow response cannot pile up a queue of overlapping requests. Ordinary polling pauses while the page is hidden and resumes when it is visible again. If a refresh fails, the interface keeps showing the last valid data.',
          'Control failures need different handling from read failures. A timeout does not prove that a device ignored a command, so after a failed action the interface asks the backend for the current state rather than automatically repeating a command that may already have taken effect.',
        ],
      },
      {
        title: 'The systems behind the screen',
        paragraphs: [
          'The dashboard sits on top of systems I operate every day: automated backups, directional Wi-Fi and cellular connectivity, and storage protection that responds to the vehicle’s ignition state.',
          'The small demo below is an illustrative interface with simulated data. It lets you explore a few of the dashboard’s control patterns without connecting to the van.',
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
    period: '2018–2026',
    tags: ['TypeScript', 'Firebase', 'Puppeteer', 'AngularJS'],
    intro:
      'Form Engine turns existing documents into fillable web forms and generates pixel-accurate PDFs from the results. I was one of three core engineers on the product for eight years at Advantage Integrated Solutions.',
    role: 'Core product engineer; form builder and PDF platform ownership',
    sections: [
      {
        title: 'Keeping the original document useful',
        paragraphs: [
          'Many business processes depend on a particular document layout, and digitizing the process does not remove that need: people still expect to receive, print, or sign the document they recognize. Within the product, I built the form-builder core during the initial buildout and owned the Puppeteer-based PDF generation platform, the part that produces those documents.',
          'That work ran from the browser to the backend: template editing, signature capture, fonts, rendering timing, and the final PDF output. The product also supported Quickbase, ServiceNow, and Salesforce as data providers.',
        ],
      },
      {
        title: 'Sending only what the endpoint needs',
        paragraphs: [
          'One API path was serializing the full in-memory form template even though the endpoint needed only a small set of identifiers. I replaced that request with a compact payload carrying only what the endpoint needed, which eliminated multi-second uploads in throttled Fast 3G tests.',
          'In separate template-loading work, I stopped the API from returning embedded document assets when the caller only needed links; development benchmarks showed roughly halved page-load and template-fetch times. Bundle optimization reduced the JavaScript size by 25%. Those are separate measurements, not a single application-wide speedup.',
        ],
      },
      {
        title: 'Maintaining the product as its dependencies changed',
        paragraphs: [
          'Over the product’s life, I led its Node.js runtime migrations and migrated a legacy XML API to JSON REST endpoints. I also independently built a healthcare EDI module for claim generation and remittance processing.',
          'In 2026, I added LLM-based form-template generation built on MCP tools and the OpenAI Agents SDK, with transaction logging so each generation can be audited.',
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
    period: '2018–2026',
    tags: ['Ruby', 'AWS', 'SFTP', 'Quickbase'],
    intro:
      'I was the long-term primary contributor to BrightSpring/ResCare’s background-job platform, which carried data between workforce applications and state and county agencies. It ran more than 50 jobs across roughly 30 active schedules.',
    role: 'Primary contributor, integration development, and platform maintenance',
    sections: [
      {
        title: 'Business processes carried in files',
        paragraphs: [
          'The integrations moved data as files, through SFTP transfers and Excel or CSV spreadsheets, and each one was shaped by the requirements of a particular agency or regional application. Maintaining the platform meant understanding those workflows as well as the code that transformed and transferred the data.',
        ],
      },
      {
        title: 'Replacing the servers underneath the jobs',
        paragraphs: [
          'The oldest parts of the platform dated from 2012. I led its Ruby 2.4 upgrade in 2019, and over seven years I maintained that code while removing more of it than I added.',
          'In 2025 I independently migrated the platform to a new Amazon Linux 2023 server and upgraded its codebase from a legacy Ruby version to Ruby 3.3. I wrote the migration runbook and the new cron schedule, ported the jobs still in use to the new environment, and decommissioned the server they had run on.',
        ],
      },
      {
        title: 'Part of a broader production responsibility',
        paragraphs: [
          'Alongside this platform, I maintained customer-facing portals, document systems, database archives, and AWS infrastructure. That included runtime upgrades, RDS migrations, backups, certificate rollout tooling, and monitoring.',
          'I kept these systems running for years as client requirements and their dependencies changed, and I carried each change through from writing it to deploying and supporting it.',
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
      'I built Fieldwork to keep company research, job openings, application status, and document versions in one local workspace. It connects to Codex, OpenAI’s agent, which helps me investigate opportunities and review the evidence behind a decision.',
    role: 'Product direction, interface design, and full-stack development',
    sections: [
      {
        title: 'From a posting to a useful record',
        paragraphs: [
          'A saved job link on its own tells me little. I also need the company context, location requirements, compensation, the date the posting was checked, and the questions that still need an answer. Fieldwork keeps all of that together in one record for the opening.',
          'The React interface lets me search and filter openings, compare roles, save views, and keep my own notes next to the research and its sources. Company pages, openings, and application records link to one another, so the context I gather once stays available at each later step.',
        ],
      },
      {
        title: 'Research assistance, with a review step',
        paragraphs: [
          'I use Ask Codex to compare a role with my experience, investigate company policies, and identify gaps worth following up on. I choose what to investigate, check the supporting sources, and decide which opportunities to pursue.',
          'The agent workspace runs on my existing Codex account. Every task starts from a prompt I can edit and the context I choose to include: the opening, the company, and selected notes about my experience. Task history and the connection status stay visible while I review the results.',
        ],
      },
      {
        title: 'Refreshing research without losing personal work',
        paragraphs: [
          'The TypeScript and Node.js backend stores personal records in SQLite, separately from imported research that can be rebuilt. Refreshing a posting should not erase a bookmark, replace a note, or move an application to a different status.',
          'Each piece of research keeps its source and the date it was observed. An incomplete scan does not prove a role has closed, so the app keeps the status uncertain rather than marking the role closed. Version-checked writes help keep a stale browser tab from overwriting newer personal changes.',
        ],
      },
      {
        title: 'Improving the app from inside the app',
        paragraphs: [
          'The App design workspace lets me describe an interface change and see it in a separate preview. Before applying it, I can inspect the changed files along with the build and browser-check results.',
          'The preview runs in a separate environment with my private application records excluded. When I apply a reviewed change, the app first checks that the source files still match what was reviewed; if something else has edited them in the meantime, the update is blocked rather than overwriting that edit.',
        ],
      },
      {
        title: 'Keeping an accurate application history',
        paragraphs: [
          'Preparing an application and recording its submission are separate actions. Recording a submission stores the exact document versions I selected as immutable copies, so editing a file later cannot change the record of what was sent.',
          'The browser talks to a local Express server, so the whole workspace stays on my machine, and backups cover both the database and the preserved document copies. The screenshots above use example records and unsent prompts to show the research, review, and design workflows.',
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
      'I developed a telemetry system for my 2022 Ram ProMaster. Investigating CAN bus signals and building a Python data broker gave me the data to show live readings and trends in a tablet web app. It combines gauges, parked battery status, trip history, and an evidence-based warning system.\n\nThe same CAN work produced a handy guarded control action, initiated from the dashboard: the doors can be locked or unlocked **remotely** through a single verified CAN frame!',
    role: 'Signal research, acquisition tooling, backend, and dashboard development',
    sections: [
      {
        title: 'The meaning behind the bytes',
        paragraphs: [
          'The useful work started before decoding traffic: reviewing service information, existing findings, and diagnostic-tool behavior for the modules actually installed in the van. Definitions from related vehicles were leads to investigate, not proof that this vehicle used the same encoding.',
          'I recorded CAN traffic while AlfaOBD, a diagnostic app, collected labeled diagnostic readings. Each labeled reading was then linked back to its exact request and response frames in the capture, which gave the two data sets a common timestamp. That mattered when the tablet and the capture computer disagreed about the time.',
          'Python tooling then searched for candidate fields, testing byte order, signedness, packed-bit layouts, scale, and offset. Its field engine could represent signals that crossed byte boundaries instead of assuming every reading occupied a whole byte or word.',
        ],
      },
      {
        title: 'Mapping signals through correlation and tiered evidence',
        paragraphs: [
          'Engine speed was a useful positive result. A two-byte field in broadcast frame 0x0FC matched the engine computer’s RPM reading at a quarter scale across a loaded drive. Together with the earlier idle analysis and the evidence identifying that field, this supported publishing RPM to the dashboard from passive broadcasts alone.',
          'Other candidates failed the harder checks. One torque-related field tracked the reference torque reading under load, but the relationship changed during lift-off and overrun, so it remained a candidate instead of being presented as actual engine torque.',
          'The validation tooling kept the data used to discover a mapping separate from the independent drives used to test it, and a mapping needed support for its physical meaning, not just a numerical fit. The project records each value’s evidence tier: verified, following an observed scan-tool scale, derived, or still an estimate.',
        ],
      },
      {
        title: 'Keeping acquisition separate from the interface',
        paragraphs: [
          'A Python broker owns all access to the vehicle buses and exposes an approved set of metrics. Readings such as RPM, coolant temperature, oil pressure, and voltage come from passive broadcasts. Measurements that still need a diagnostic request go through narrow, explicitly allowed paths that check the vehicle’s state and bus ownership first.',
          'The web layer reads only the broker’s cache; opening a page or receiving a stream update does not by itself trigger a read from the CAN bus. Each reading carries its source, quality, and age, and the client accounts for delivery delays and reconnections before treating a value as current.',
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
          'The dashboard also has an advisor built on Codex, OpenAI’s agent. It can talk through a saved event or propose a warning rule limited to numeric thresholds, and I review every setting before the rule is saved; the advisor has no tools that touch the CAN bus or the services. The screenshots show illustrative telemetry and warning scenarios, including a simulated conversation, not evidence of a particular drive or diagnosis.',
        ],
      },
    ],
  },
]
