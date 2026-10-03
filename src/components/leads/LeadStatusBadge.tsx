import type { LeadStatus } from '../../types/database'
import { Badge } from '../ui/DataDisplay'
import { statusLabels } from './leadMeta'

const tones: Record<LeadStatus, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  new: 'neutral', contacted: 'info', interested: 'success', negotiation: 'warning',
  no_response: 'neutral', not_interested: 'error', won: 'success', lost: 'error',
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) { return <Badge tone={tones[status]}>{statusLabels[status]}</Badge> }
