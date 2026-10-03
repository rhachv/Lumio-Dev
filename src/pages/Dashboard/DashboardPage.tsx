import { Link } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { EmptyState } from '../../components/ui/States'

const metrics = ['Leads', 'Interessados', 'Em negociação', 'Clientes', 'Propostas', 'Bloqueados']
const actions = [
  { label: 'Novo lead', path: '/leads/novo', icon: 'users' as const },
  { label: 'Importar leads', path: '/importacao', icon: 'upload' as const },
  { label: 'Novo script', path: '/scripts/novo', icon: 'message' as const },
  { label: 'Adicionar referência', path: '/biblioteca/novo', icon: 'book' as const },
  { label: 'Nova proposta', path: '/propostas/nova', icon: 'file' as const },
]

export function DashboardPage() {
  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date())
  return <div className="page-wrap dashboard-page">
    <div className="page-header dashboard-heading"><div><p className="eyebrow">{today}</p><h1>Bom trabalho.</h1><p className="page-subtitle">Aqui está uma visão geral da sua operação.</p></div><Link className="button button--primary" to="/leads/novo"><Icon name="plus" />Novo lead</Link></div>
    <section className="metric-grid" aria-label="Indicadores da operação">{metrics.map((metric) => <article className="metric-item" key={metric}><span className="metric-label">{metric}</span><strong className="metric-value" aria-label={`${metric}: sem dados`}>—</strong></article>)}</section>
    <div className="dashboard-columns"><section className="dashboard-section activity-section"><div className="section-heading"><div><h2>Atividade recente</h2><p>Movimentações da sua operação</p></div><span className="section-period">Últimos registros</span></div><EmptyState title="Tudo começa com um primeiro lead" description="Quando iniciar sua prospecção, as atividades recentes aparecerão aqui." action={<Link className="text-link" to="/leads/novo">Adicionar primeiro lead <Icon name="arrow" /></Link>} /></section>
      <section className="dashboard-section quick-section"><div className="section-heading"><div><h2>Ações rápidas</h2><p>Continue de onde precisa</p></div></div><div className="quick-list">{actions.map((action) => <Link className="quick-action" key={action.path} to={action.path}><span className="quick-icon"><Icon name={action.icon} /></span><span>{action.label}</span><Icon name="chevron" className="quick-chevron" /></Link>)}</div></section></div>
    <section className="dashboard-section leads-preview"><div className="section-heading"><div><h2>Prospecção</h2><p>Seus leads em um só lugar</p></div><Link className="text-link" to="/leads">Ver prospecção <Icon name="arrow" /></Link></div><EmptyState title="Você ainda não possui leads" description="Quando começar sua prospecção, seus leads aparecerão aqui." action={<Link className="button button--secondary" to="/leads/novo"><Icon name="plus" />Adicionar primeiro lead</Link>} /></section>
  </div>
}
