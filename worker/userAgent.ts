// What a user-agent string tells analytics: whether a person is likely behind
// it, and a coarse device and browser class. The raw string is never stored.

const automatedClient = new RegExp(
  [
    'bot\\b',
    'crawl',
    'spider',
    'slurp',
    'headless',
    'phantomjs',
    'puppeteer',
    'playwright',
    'selenium',
    'webdriver',
    'lighthouse',
    'pagespeed',
    'gtmetrix',
    'preview',
    'monitor',
    'uptime',
    'curl',
    'wget',
    'python',
    'aiohttp',
    'httpx',
    'requests',
    'axios',
    'node-fetch',
    'undici',
    '\\bgot\\b',
    'okhttp',
    'go-http',
    'java\\/',
    'libwww',
    'httpclient',
    'scrapy',
    'feedfetcher',
    'facebookexternalhit',
    'embedly',
    'whatsapp',
  ].join('|'),
  'i',
)

/** Crawlers, headless browsers and command-line tools, and a missing agent. */
export const isAutomatedClient = (userAgent: string): boolean =>
  userAgent.trim() === '' || automatedClient.test(userAgent)

export type DeviceClass = 'tablet' | 'mobile' | 'desktop'

export function deviceClass(userAgent: string): DeviceClass {
  // Android tablets omit the "Mobile" token that Android phones carry.
  if (/ipad|tablet|kindle|silk|playbook|android(?!.*mobile)/i.test(userAgent))
    return 'tablet'
  if (/mobi|iphone|ipod|android|windows phone/i.test(userAgent)) return 'mobile'
  return 'desktop'
}

export type BrowserFamily = 'Edge' | 'Firefox' | 'Chrome' | 'Safari' | 'Other'

// Order matters: Edge and Chrome both say "Safari", and Edge also says
// "Chrome", so the more specific families are tested first. Other Chromium
// forks are grouped as Other rather than counted as Chrome.
const browserRules: [BrowserFamily, RegExp][] = [
  ['Edge', /\bedg(?:e|a|ios)?\//i],
  [
    'Other',
    /\bopr\/|opera|samsungbrowser|ucbrowser|yabrowser|duckduckgo|vivaldi/i,
  ],
  ['Firefox', /firefox|fxios/i],
  ['Chrome', /chrome|chromium|crios/i],
  ['Safari', /safari/i],
]

export function browserFamily(userAgent: string): BrowserFamily {
  return (
    browserRules.find(([, pattern]) => pattern.test(userAgent))?.[0] ?? 'Other'
  )
}
