 
import type { Timesheet, TimesheetStatus } from '../types'
import Button from './ui/Button'
import Spinner from './ui/Spinner'

interface TimesheetTableProps {
  items: Timesheet[]
  isLoading?: boolean
  onEdit: (item: Timesheet) => void
  onSubmit: (id: string) => void
  onApprove: (id: string) => void
  onDelete: (id: string) => void
  currentPage: number
  pageCount: number
  onPageChange: (page: number) => void
  onSort?: (key: 'entry_date' | 'hours' | 'status') => void
  sort?: { key: 'entry_date' | 'hours' | 'status'; direction: 'asc' | 'desc' }
  isManager?: boolean
}

const statusClass: Record<TimesheetStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-400',
  submitted: 'bg-blue-500/10 text-blue-400',
  approved: 'bg-green-500/10 text-green-400',
  invoiced: 'bg-purple-500/10 text-purple-400',
}

export default function TimesheetTable({
  items,
  isLoading,
  onEdit,
  onSubmit,
  onApprove,
  onDelete,
  currentPage,
  pageCount,
  onPageChange,
  onSort,
  sort,
  isManager,
}: TimesheetTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-background-dark">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-muted cursor-pointer" onClick={() => onSort?.('entry_date')}>
              Date {sort?.key === 'entry_date' && <span className="text-xs">{sort.direction === 'asc' ? '↑' : '↓'}</span>}
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Project</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Activity</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-muted cursor-pointer" onClick={() => onSort?.('hours')}>
              Hours {sort?.key === 'hours' && <span className="text-xs">{sort.direction === 'asc' ? '↑' : '↓'}</span>}
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-muted cursor-pointer" onClick={() => onSort?.('status')}>
              Status {sort?.key === 'status' && <span className="text-xs">{sort.direction === 'asc' ? '↑' : '↓'}</span>}
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-dark">
          {isLoading ? (
            <tr>
              <td colSpan={6} className="p-8 text-center">
                <Spinner />
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-text-muted">
                No timesheets yet. Click 'Add Timesheet' to get started.
              </td>
            </tr>
          ) : (
            items.map((t) => (
              <tr key={t.id} className="hover:bg-nav-hover">
                <td className="px-4 py-3 text-white">{t.entry_date}</td>
                <td className="px-4 py-3 text-white">{t.project?.name || '—'}</td>
                <td className="px-4 py-3 text-white">{t.activity_type?.name || '—'}</td>
                <td className="px-4 py-3 text-white">{t.hours}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${statusClass[t.status]}`}>{t.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {t.status === 'draft' && (
                      <>
                        <Button variant="secondary" onClick={() => onEdit(t)}>
                          Edit
                        </Button>
                        <Button onClick={() => onSubmit(t.id)}>Submit</Button>
                        <Button variant="danger" onClick={() => onDelete(t.id)}>Delete</Button>
                      </>
                    )}
                    {t.status === 'submitted' && isManager && (
                      <>
                        <Button onClick={() => onApprove(t.id)}>Approve</Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex items-center justify-between p-4">
        <p className="text-sm text-text-muted">Page {currentPage} of {pageCount}</p>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>Prev</Button>
          <Button variant="secondary" disabled={currentPage >= pageCount} onClick={() => onPageChange(currentPage + 1)}>Next</Button>
        </div>
      </div>
    </div>
  )
}
