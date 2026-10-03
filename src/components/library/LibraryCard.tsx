import { Link } from 'react-router-dom'
import { Button } from '../ui/FormControls'
import { Icon } from '../ui/Icon'
import { libraryItemTypeLabels } from '../../services/libraryValidation'
import type { LibraryItemView } from '../../services/library'

export function LibraryCard({ item, onFavorite, onArchive, onTag, busy = false }: {
  item: LibraryItemView; onFavorite: (item: LibraryItemView) => void; onArchive: (item: LibraryItemView) => void; onTag: (tagId: string) => void; busy?: boolean
}) {
  return <article className="library-card">
    <Link className={`library-card-visual library-visual--${item.type}`} to={`/biblioteca/${item.id}`} aria-label={`Visualizar ${item.title}`}>
      {item.screenshotUrl ? <img src={item.screenshotUrl} alt={`Screenshot: ${item.title}`} loading="lazy" decoding="async" /> : <div className="library-visual-placeholder"><span className="library-visual-mark"><Icon name="book" /></span><span>{libraryItemTypeLabels[item.type]}</span></div>}
    </Link>
    <div className="library-card-body"><div className="library-card-heading"><span className="library-type-label">{libraryItemTypeLabels[item.type]}</span><button type="button" className={`library-favorite${item.is_favorite ? ' is-active' : ''}`} aria-label={item.is_favorite ? `Remover ${item.title} dos favoritos` : `Adicionar ${item.title} aos favoritos`} aria-pressed={item.is_favorite} disabled={busy} onClick={() => onFavorite(item)}><Icon name="star" /></button></div>
      <Link to={`/biblioteca/${item.id}`} className="library-card-title"><h2>{item.title}</h2></Link>
      {item.description && <p className="library-card-description">{item.description}</p>}
      {item.tags.length > 0 && <div className="library-card-tags">{item.tags.slice(0, 5).map((tag) => <button type="button" key={tag.id} onClick={() => onTag(tag.id)}>#{tag.name}</button>)}{item.tags.length > 5 && <span>+{item.tags.length - 5}</span>}</div>}
      <div className="library-card-actions">{item.url && <a className="text-link" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir referência externa: ${item.title}`}><Icon name="arrow" />Abrir</a>}<Link className="text-link" to={`/biblioteca/${item.id}`}>Detalhes</Link><Button onClick={() => onArchive(item)} disabled={busy}><Icon name={item.is_archived ? 'restore' : 'archive'} />{item.is_archived ? 'Restaurar' : 'Arquivar'}</Button></div>
    </div>
  </article>
}
