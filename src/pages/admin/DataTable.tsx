import { useId, type ReactNode } from 'react'
import { useOverflowing } from './useOverflowing'
import './DataTable.css'

export type Column<Row> = {
  header: string
  numeric?: boolean
  cell: (row: Row) => ReactNode
}

/** A titled table whose first column is the row header; an empty list says so instead of showing headers alone. */
export function DataTable<Row>({
  title,
  columns,
  rows,
  rowKey,
  emptyText = 'No visits yet',
  className = '',
}: {
  title: string
  columns: Column<Row>[]
  rows: Row[]
  rowKey: (row: Row, index: number) => string
  emptyText?: string
  className?: string
}) {
  const titleId = useId()
  const [scroller, overflowing] = useOverflowing<HTMLDivElement>(
    rows.length > 0,
  )
  return (
    <section className={`data-table ${className}`} aria-labelledby={titleId}>
      <h3 id={titleId}>{title}</h3>
      {rows.length === 0 ? (
        <p className="data-table-empty">{emptyText}</p>
      ) : (
        <div
          className="data-table-scroll"
          ref={scroller}
          // Only a table that really scrolls sideways becomes a tab stop, so
          // keyboard users can scroll it without every table adding one.
          role={overflowing ? 'region' : undefined}
          aria-labelledby={overflowing ? titleId : undefined}
          tabIndex={overflowing ? 0 : undefined}
        >
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.header}
                    scope="col"
                    className={
                      column.numeric ? 'data-table-numeric' : undefined
                    }
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={rowKey(row, index)}>
                  {columns.map((column, position) => {
                    const Cell = position === 0 ? 'th' : 'td'
                    return (
                      <Cell
                        key={column.header}
                        scope={position === 0 ? 'row' : undefined}
                        className={
                          column.numeric ? 'data-table-numeric' : undefined
                        }
                      >
                        {column.cell(row)}
                      </Cell>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
