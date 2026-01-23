 
import type { Timesheet, TimesheetStatus } from '../types'
import Button from './ui/Button'

interface TimesheetCardProps {
  item: Timesheet
  onEdit: (item: Timesheet) => void
  onSubmit: (id: string) => void
  onApprove: (id: string) => void
  onDelete: (id: string) => void
  isManager?: boolean
}

const statusClass: Record<TimesheetStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-400',
  submitted: 'bg-blue-500/10 text-blue-400',
  approved: 'bg-green-500/10 text-green-400',
  invoiced: 'bg-purple-500/10 text-purple-400',
}

export default function TimesheetCard({ item, onEdit, onSubmit, onApprove, onDelete, isManager }: TimesheetCardProps) {
  return (
    <div className="bg-card-dark border border-border-dark rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium">{item.project?.name || 'Project'}</p>
          <p className="text-text-muted text-sm">{item.entry_date} • {item.activity_type?.name || 'Activity'}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${statusClass[item.status]}`}>{item.status}</span>
      </div>
      <p className="text-white">Hours: {item.hours}</p>
      {item.notes && <p className="text-text-muted text-sm">{item.notes}</p>}
      <div className="flex gap-2 justify-end">
        {item.status === 'draft' && (
          <>
            <Button variant="secondary" onClick={() => onEdit(item)}>Edit</Button>
            <Button onClick={() => onSubmit(item.id)}>Submit</Button>
            <Button variant="danger" onClick={() => onDelete(item.id)}>Delete</Button>
          </>
        )}
        {item.status === 'submitted' && isManager && (
          <Button onClick={() => onApprove(item.id)}>Approve</Button>
        )}
      </div>
    </div>
  )
}
