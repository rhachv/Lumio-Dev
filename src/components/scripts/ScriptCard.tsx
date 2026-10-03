import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Button } from '../ui/FormControls'
import { highlightVariables } from './ScriptText'
import { formatDate } from '../leads/leadMeta'
import type { ScriptListItem } from '../../types/database'

export function ScriptCard({ script, onCopy, onFavorite, onArchive, busy }: {
  script: ScriptListItem
  onCopy: (script: ScriptListItem) => void
  onFavorite: (script: ScriptListItem) => void
  onArchive: (script: ScriptListItem) => void
  busy: boolean
}) {
  return <article className="script-card">
    <div className="script-card-top"><span className="script-category-badge">{script.category_name}</span><button type="button" className={`script-favorite${script.is_favorite ? ' is-active' : ''}`} aria-label={script.is_favorite ? `Remover ${script.title} dos favoritos` : `Adicionar ${script.title} aos favoritos`} aria-pressed={script.is_favorite} onClick={() => onFavorite(script)} disabled={busy}><Icon name="star" /></button></div>
    <Link className="script-card-title" to={`/scripts/${script.id}`}><h2>{script.title}</h2></Link>
    {script.objective && <p className="script-card-objective">{script.objective}</p>}
    <p className="script-card-content">{highlightVariables(script.content)}</p>
    <div className="script-card-meta"><span>{script.niche_name || 'Geral'}</span><span>Atualizado {formatDate(script.updated_at)}</span></div>
    <div className="script-card-actions"><Button variant="primary" onClick={() => onCopy(script)} disabled={busy}><Icon name="copy" />Copiar</Button><Link className="button button--secondary" to={`/scripts/${script.id}`}>Visualizar</Link><button type="button" className="icon-button" aria-label={`${script.is_archived ? 'Restaurar' : 'Arquivar'} ${script.title}`} title={script.is_archived ? 'Restaurar script' : 'Arquivar script'} onClick={() => onArchive(script)} disabled={busy}><Icon name={script.is_archived ? 'restore' : 'archive'} /></button></div>
  </article>
}
