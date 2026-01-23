 
import Modal from './ui/Modal'
import Button from './ui/Button'
import type { Timesheet } from '@/types'

interface ApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  timesheet?: Timesheet
  onApprove: (id: string) => Promise<void>
}

export default function ApprovalModal({ isOpen, onClose, timesheet, onApprove }: ApprovalModalProps) {
  if (!timesheet) return null
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Approve Timesheet">
      <div className="space-y-3">
        <div className="bg-card-dark border border-border-dark rounded p-3">
          <p className="text-white font-medium">{timesheet.user?.full_name || timesheet.user?.email}</p>
          <p className="text-text-muted text-sm">{timesheet.project?.name} • {timesheet.cost_center?.name || 'No Cost Center'}</p>
          <p className="text-white">{timesheet.entry_date} • {timesheet.hours} hours</p>
          <p className="text-text-muted text-sm">{timesheet.activity_type?.name}</p>
          {timesheet.notes && <p className="text-text-muted text-sm mt-2">Notes: {timesheet.notes}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={async () => { await onApprove(timesheet.id); onClose() }}>Approve</Button>
        </div>
      </div>
    </Modal>
  )
}
