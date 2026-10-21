// Henry Broddle's letter as written, except his email address: a third
// party's contact details stay off the public site and go out on request.
export const recommendation = {
  author: 'Henry Broddle',
  title: 'Chief Technology Officer',
  company: 'Advantage Integrated Solutions, Inc.',
  date: 'October 7, 2026',
  quote:
    'He is one of the most capable and resourceful engineers I have worked with.',
  excerpt:
    'Jake does more than finish tickets. He builds the tools and foundations that make everyone else faster.',
  salutation: 'To the Hiring Committee:',
  // Blank lines separate blocks, a block of "- " lines is a list, and
  // **text** renders bold.
  letter: `I am pleased to recommend Jake Iwen. I worked with Jake at Advantage Integrated Solutions for roughly eight years, from 2018 to 2026, where he was a software developer on my team. He is one of the most capable and resourceful engineers I have worked with. He is also a long-time friend, and I say that openly because I would put my professional name behind this recommendation either way.

**Breadth and depth.** Jake works across the whole stack. At Advantage he wrote production code in TypeScript, JavaScript and React on the front end, and in Ruby on Rails, Python and Node on the back end. He is equally good at building a polished interface and at the less visible work behind it: integrations, scheduled job servers, authentication and infrastructure tooling.

**Substantial, sustained output.** Over his tenure Jake made nearly 6,000 commits across more than 60 repositories. He authored over 330 pull requests, about 260 of which were merged, and he reviewed his teammates' work as well. This was steady, reviewed and shipped work, not a short burst of activity.

**He builds things others reuse.** Jake does more than finish tickets. He builds the tools and foundations that make everyone else faster. Three examples:

- He was the main force behind our second-generation form-building platform. It is a TypeScript engine of nearly 1,900 commits, and it grew out of the first-generation product.
- He built a React component library that cut down the custom styling needed on each new form.
- He rebuilt our background-job server for a major healthcare client. It replaced a legacy system and kept running as the main home for new automation.

Beyond these he built client-facing portals, document and PDF generation services, email and OAuth integrations, and a stream of small command-line and monitoring utilities, such as SSL-certificate tooling and uptime checks.

**Resourcefulness.** When Jake meets a problem nobody has solved, he works it out. Much of our work involved integrating with third-party platforms whose tooling was limited, and Jake wrote his own client libraries and command-line tools to fill the gaps. He learns quickly, picks up new stacks without fuss, and needs very little supervision.

Jake would be a major asset to any organization that takes him on. He would raise the technical level of his team and build things that last. I recommend him without reservation, and I'm happy to answer any questions.`,
  closing: 'Sincerely,',
}
