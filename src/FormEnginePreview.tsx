export const formEngineUrl = 'https://www.formengine.com/'

export default function FormEnginePreview({
  loading = 'lazy',
}: {
  loading?: 'lazy' | 'eager'
}) {
  return (
    <img
      className="form-engine-screenshot"
      src="/images/form-engine-portal.png"
      alt="Form Engine vendor intake and self-service portal displayed on a laptop and phone."
      width={1500}
      height={1170}
      loading={loading}
      decoding="async"
    />
  )
}
