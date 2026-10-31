import { ArrowDown, ArrowUp } from 'lucide-react'
import './OrderedListEditor.css'
import './admin.css'

export type Direction = 'up' | 'down'

/** One item of an ordered list: its label, a Visible checkbox and Move up / Move down. */
export function OrderedRow({
  label,
  visible,
  first,
  last,
  onVisibleChange,
  onMove,
  registerButton,
}: {
  label: string
  visible: boolean
  first: boolean
  last: boolean
  onVisibleChange: (visible: boolean) => void
  onMove: (direction: Direction) => void
  registerButton: (
    direction: Direction,
  ) => (button: HTMLButtonElement | null) => void
}) {
  return (
    <li className={visible ? 'order-row' : 'order-row order-row-hidden'}>
      <span className="order-name">
        {label}
        {visible ? null : <span className="order-tag">Hidden</span>}
      </span>
      <label className="order-visible">
        <input
          type="checkbox"
          checked={visible}
          aria-label={`${label} visible`}
          onChange={(event) => onVisibleChange(event.target.checked)}
        />
        Visible
      </label>
      <span className="order-moves">
        <button
          type="button"
          className="admin-button order-move"
          aria-label={`Move ${label} up`}
          disabled={first}
          ref={registerButton('up')}
          onClick={() => onMove('up')}
        >
          <ArrowUp size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="admin-button order-move"
          aria-label={`Move ${label} down`}
          disabled={last}
          ref={registerButton('down')}
          onClick={() => onMove('down')}
        >
          <ArrowDown size={18} aria-hidden="true" />
        </button>
      </span>
    </li>
  )
}
