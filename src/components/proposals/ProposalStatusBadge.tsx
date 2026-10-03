import { Badge } from '../ui/DataDisplay'
import type { ProposalStatus } from '../../types/database'
import { proposalStatusLabel, proposalStatusTone } from './proposalMeta'

export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  return <Badge tone={proposalStatusTone(status)}>{proposalStatusLabel(status)}</Badge>
}
