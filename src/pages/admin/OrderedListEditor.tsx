import { useEffect, useRef, useState } from 'react'
import type { OrderedItem } from '../../settings/siteSettings'
import { OrderedRow, type Direction } from './OrderedRow'
import './OrderedListEditor.css'
import './admin.css'

function moved<Id extends string>(
  items: OrderedItem<Id>[],
  index: number,
  direction: Direction,
): OrderedItem<Id>[] {
  const next = [...items]
  const [item] = next.splice(index, 1)
  next.splice(index + (direction === 'up' ? -1 : 1), 0, item)
  return next
}

/**
 * Reorder and show/hide the items of one homepage list. Hidden items stay in
 * the list, dimmed, so they can be shown again.
 */
export function OrderedListEditor<Id extends string>({
  title,
  items,
  labelFor,
  onChange,
}: {
  title: string
  items: OrderedItem<Id>[]
  labelFor: (id: Id) => string
  onChange: (items: OrderedItem<Id>[]) => void
}) {
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const refocus = useRef<{ id: Id; direction: Direction } | null>(null)
  const [announcement, setAnnouncement] = useState('')

  // A reorder re-inserts the rows; put focus back on the button that was used so
  // repeated presses keep moving the same item, or on its opposite at the ends.
  useEffect(() => {
    const target = refocus.current
    if (!target) return
    refocus.current = null
    const other = target.direction === 'up' ? 'down' : 'up'
    const button = [target.direction, other]
      .map((direction) => buttons.current.get(`${target.id}:${direction}`))
      .find((candidate) => candidate && !candidate.disabled)
    button?.focus()
  }, [items])

  function move(index: number, direction: Direction) {
    const item = items[index]
    refocus.current = { id: item.id, direction }
    const position = index + (direction === 'up' ? -1 : 1) + 1
    setAnnouncement(
      `${labelFor(item.id)} moved ${direction}, position ${position} of ${items.length}`,
    )
    onChange(moved(items, index, direction))
  }

  const register = (id: Id) => (direction: Direction) => {
    const key = `${id}:${direction}`
    return (button: HTMLButtonElement | null) => {
      if (button) buttons.current.set(key, button)
      else buttons.current.delete(key)
    }
  }

  return (
    <div className="order-editor">
      <h3>{title}</h3>
      <ol className="order-list">
        {items.map((item, index) => (
          <OrderedRow
            key={item.id}
            label={labelFor(item.id)}
            visible={item.visible}
            first={index === 0}
            last={index === items.length - 1}
            onVisibleChange={(visible) =>
              onChange(
                items.map((entry, position) =>
                  position === index ? { ...entry, visible } : entry,
                ),
              )
            }
            onMove={(direction) => move(index, direction)}
            registerButton={register(item.id)}
          />
        ))}
      </ol>
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}
