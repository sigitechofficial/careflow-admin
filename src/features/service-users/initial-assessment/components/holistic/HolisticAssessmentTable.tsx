import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import {
  HOLISTIC_TABLE_CLASS,
  HOLISTIC_TABLE_CELL_CLASS,
  HOLISTIC_TABLE_HEAD_CLASS,
} from '@/features/service-users/initial-assessment/utils/holistic-form-typography'

export type HolisticTableColumn = {
  key: string
  header: string
  className?: string
}

type Props = {
  columns: HolisticTableColumn[]
  children: ReactNode
  className?: string
}

export function HolisticAssessmentTable({ columns, children, className }: Props) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className={HOLISTIC_TABLE_CLASS}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={cn(HOLISTIC_TABLE_HEAD_CLASS, col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function HolisticAssessmentTableRow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <tr className={className}>{children}</tr>
}

export function HolisticAssessmentTableCell({
  children,
  className,
  rowSpan,
  colSpan,
}: {
  children: ReactNode
  className?: string
  rowSpan?: number
  colSpan?: number
}) {
  return (
    <td rowSpan={rowSpan} colSpan={colSpan} className={cn(HOLISTIC_TABLE_CELL_CLASS, className)}>
      {children}
    </td>
  )
}
