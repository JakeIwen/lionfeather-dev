// Deployment settings come from the environment (the systemd unit and the
// root-only env file). A missing value stops startup: an empty audience or
// client id would otherwise let the Access check pass for the wrong caller.
const HOSTNAME = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i

export const BIND_ADDRESS = '127.0.0.1'

export function loadConfig(env = process.env) {
  const problems = []
  const read = (name) => {
    const value = (env[name] ?? '').trim()
    if (!value) problems.push(`${name} is not set`)
    return value
  }
  const teamDomain = read('ACCESS_TEAM_DOMAIN')
  const audience = read('ACCESS_AUD')
  const clientId = read('ACCESS_CLIENT_ID')
  const publicHost = read('PUBLIC_HOST').toLowerCase()
  const port = Number(read('PORT'))
  for (const [name, value] of [
    ['ACCESS_TEAM_DOMAIN', teamDomain],
    ['PUBLIC_HOST', publicHost],
  ]) {
    if (value && !HOSTNAME.test(value))
      problems.push(`${name} is not a hostname`)
  }
  if (env.PORT && !(Number.isInteger(port) && port >= 1 && port <= 65535)) {
    problems.push('PORT is not a port number')
  }
  if (problems.length) {
    throw new Error(
      `Invalid review service configuration: ${problems.join('; ')}.`,
    )
  }
  return {
    teamDomain,
    audience,
    clientId,
    publicHost,
    port,
    workDirectory: (env.REVIEW_WORKDIR ?? '').trim() || null,
  }
}
