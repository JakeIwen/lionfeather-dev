import assert from 'node:assert/strict'
import { before, test } from 'node:test'
import { loadModule } from './worker-harness.mjs'

let agent
before(async () => {
  agent = await loadModule('worker/userAgent.ts')
})

const chrome = 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0'
const webkit = 'AppleWebKit/605.1.15 (KHTML, like Gecko)'
// [name, user agent, device, browser]
const people = [
  [
    'desktop Chrome',
    `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${chrome} Safari/537.36`,
    'desktop',
    'Chrome',
  ],
  [
    'desktop Edge',
    `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${chrome} Safari/537.36 Edg/130.0.0.0`,
    'desktop',
    'Edge',
  ],
  [
    'Edge on Android',
    `Mozilla/5.0 (Linux; Android 14; Pixel 8) ${chrome} Mobile Safari/537.36 EdgA/130.0.0.0`,
    'mobile',
    'Edge',
  ],
  [
    'Edge on iOS',
    `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) ${webkit} Version/17.0 EdgiOS/130.0 Mobile/15E148 Safari/605.1.15`,
    'mobile',
    'Edge',
  ],
  [
    'desktop Firefox',
    'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0',
    'desktop',
    'Firefox',
  ],
  [
    'Firefox on iOS',
    `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) ${webkit} FxiOS/130.0 Mobile/15E148 Safari/605.1.15`,
    'mobile',
    'Firefox',
  ],
  [
    'desktop Safari',
    `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${webkit} Version/17.5 Safari/605.1.15`,
    'desktop',
    'Safari',
  ],
  [
    'iPhone Safari',
    `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) ${webkit} Version/17.5 Mobile/15E148 Safari/604.1`,
    'mobile',
    'Safari',
  ],
  [
    'iPad Safari',
    `Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) ${webkit} Version/17.5 Mobile/15E148 Safari/604.1`,
    'tablet',
    'Safari',
  ],
  [
    'Chrome on iOS',
    `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) ${webkit} CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1`,
    'mobile',
    'Chrome',
  ],
  [
    'Chrome on an Android phone',
    `Mozilla/5.0 (Linux; Android 14; Pixel 8) ${chrome} Mobile Safari/537.36`,
    'mobile',
    'Chrome',
  ],
  [
    'Chrome on an Android tablet',
    `Mozilla/5.0 (Linux; Android 13; SM-X710) ${chrome} Safari/537.36`,
    'tablet',
    'Chrome',
  ],
  [
    'Opera',
    `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${chrome} Safari/537.36 OPR/115.0.0.0`,
    'desktop',
    'Other',
  ],
  [
    'Samsung Internet',
    `Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36`,
    'mobile',
    'Other',
  ],
  ['an unrecognised browser', 'Foo/1.0', 'desktop', 'Other'],
  [
    'a phone brand that contains "bot"',
    'Mozilla/5.0 (Linux; Android 10; CUBOT_X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
    'mobile',
    'Chrome',
  ],
]

for (const [name, userAgent, device, browser] of people) {
  test(`${name} is a person on a ${device} using ${browser}`, () => {
    assert.equal(agent.isAutomatedClient(userAgent), false)
    assert.equal(agent.deviceClass(userAgent), device)
    assert.equal(agent.browserFamily(userAgent), browser)
  })
}

const automated = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
  'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'WhatsApp/2.23.20.0 A',
  'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 11; moto g power) Chrome/130.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse',
  'curl/8.4.0',
  'Wget/1.21.4',
  'python-requests/2.31.0',
  'Python-urllib/3.12',
  'Go-http-client/2.0',
  'node-fetch/1.0',
  'axios/1.6.2',
  'okhttp/4.12.0',
  'Java/17.0.2',
  'UptimeRobot/2.0',
  '',
  '   ',
]
for (const userAgent of automated) {
  test(`"${userAgent.slice(0, 40)}" is automated`, () => {
    assert.equal(agent.isAutomatedClient(userAgent), true)
  })
}
