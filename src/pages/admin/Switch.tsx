import './Switch.css'

/** A labelled on/off switch (a checkbox with role="switch"). */
export function Switch({
  label,
  checked,
  onChange,
  describedBy,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  describedBy?: string
}) {
  return (
    <label className="admin-switch">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}
