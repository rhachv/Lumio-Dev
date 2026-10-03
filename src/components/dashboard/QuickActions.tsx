import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../ui/Icon'

const actions: { label: string; description: string; path: string; icon: IconName }[] = [
  { label: 'Novo lead', description: 'Adicionar uma oportunidade', path: '/leads/novo', icon: 'users' },
  { label: 'Importar leads', description: 'Carregar uma planilha', path: '/importacao', icon: 'upload' },
  { label: 'Nova proposta', description: 'Registrar uma proposta', path: '/propostas/nova', icon: 'file' },
  { label: 'Abrir clientes', description: 'Consultar a carteira', path: '/clientes', icon: 'briefcase' },
  { label: 'Novo script', description: 'Guardar um roteiro', path: '/scripts/novo', icon: 'message' },
  { label: 'Adicionar referência', description: 'Salvar na biblioteca', path: '/biblioteca/novo', icon: 'book' },
]

export function QuickActions() {
  return <div className="dashboard-quick-actions">{actions.map((action) => <Link className="dashboard-quick-action" key={action.path} to={action.path}><span className="quick-icon"><Icon name={action.icon} /></span><span className="dashboard-quick-copy"><strong>{action.label}</strong><small>{action.description}</small></span><Icon name="chevron" className="quick-chevron" /></Link>)}</div>
}
