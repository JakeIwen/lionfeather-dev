const dateFormats = {
  full: new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }),
  month: new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }),
}

export function formatArticleDate(
  published: string,
  format: keyof typeof dateFormats = 'full',
) {
  return dateFormats[format].format(new Date(published))
}
