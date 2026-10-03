import type { ProposalStatusHistory } from '../../types/database'
import { historyLabel } from './proposalMeta'

export function ProposalTimeline({ events }: { events: ProposalStatusHistory[] }) {
  if (events.length === 0) return <div className="timeline-empty"><p>Nenhum histórico de status registrado.</p></div>
  return <div className="timeline-list">{events.map((event) => <article className="timeline-item timeline-item--status" key={event.id}><span className="timeline-marker" aria-hidden="true" /><div className="timeline-entry-content"><div className="timeline-entry-heading"><h3>{historyLabel(event)}</h3><time dateTime={event.changed_at}>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.changed_at))}</time></div></div></article>)}</div>
}
