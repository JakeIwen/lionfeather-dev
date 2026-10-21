// A long arrow for the step row; the lucide icon is square and too short here.
function StepArrow() {
  return (
    <svg
      className="step-arrow"
      viewBox="0 0 18 12"
      width={18}
      height={12}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 6h15.5M12 1.5 16.5 6 12 10.5" />
    </svg>
  )
}

export function SignalDiscovery() {
  return (
    <aside className="signal-discovery" aria-label="Signal discovery workflow">
      <p className="eyebrow">FROM A RAW FRAME TO A USABLE READING</p>
      <ol>
        <li>
          <strong>
            Observe
            <StepArrow />
          </strong>
          <p>Capture bus traffic alongside known diagnostic readings.</p>
        </li>
        <li>
          <strong>
            Match
            <StepArrow />
          </strong>
          <p>Align timestamps, then test bit layouts, scale, and offset.</p>
        </li>
        <li>
          <strong>
            Challenge
            <StepArrow />
          </strong>
          <p>
            Check the fit against independent drives and competing
            interpretations.
          </p>
        </li>
        <li>
          <strong>Publish</strong>
          <p>Retain the source, confidence, and freshness of each metric.</p>
        </li>
      </ol>
    </aside>
  )
}
