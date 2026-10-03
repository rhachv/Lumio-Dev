import { Link, useLocation } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { EmptyState } from '../components/ui/States'

const sections: Record<string, { title: string; description: string; createPath: string; action: string }> = {
  '/leads': { title: 'Prospecção', description: 'Organize seus contatos e acompanhe cada oportunidade.', createPath: '/leads/novo', action: 'Adicionar primeiro lead' },
  '/clientes': { title: 'Clientes', description: 'Acompanhe os relacionamentos e projetos em andamento.', createPath: '/clientes', action: 'Clientes' },
  '/propostas': { title: 'Propostas', description: 'Prepare e acompanhe propostas comerciais.', createPath: '/propostas/nova', action: 'Nova proposta' },
  '/scripts': { title: 'Scripts', description: 'Mantenha seus roteiros de abordagem organizados.', createPath: '/scripts/novo', action: 'Novo script' },
  '/biblioteca': { title: 'Biblioteca', description: 'Reúna referências para seus projetos e conversas.', createPath: '/biblioteca/novo', action: 'Adicionar referência' },
  '/importacao': { title: 'Importação', description: 'Prepare a entrada de contatos na sua operação.', createPath: '/importacao', action: 'Importação' },
  '/configuracoes': { title: 'Configurações', description: 'Preferências e informações da sua conta.', createPath: '/configuracoes', action: 'Configurações' },
}

export function PlaceholderPage() {
  const location = useLocation()
  const base = `/${location.pathname.split('/')[1]}`
  const section = sections[base] ?? { title: 'Lumio Dev', description: 'Esta área está preparada para uma próxima etapa.', createPath: '/dashboard', action: 'Voltar ao início' }
  const isSubroute = location.pathname !== base && base !== '/configuracoes' && base !== '/importacao'
  return <div className="page-wrap placeholder-page"><div className="page-header"><div><p className="eyebrow">ESPAÇO DE TRABALHO</p><h1>{isSubroute ? section.action : section.title}</h1><p className="page-subtitle">{section.description}</p></div></div><section className="dashboard-section placeholder-panel"><EmptyState title="Esta área está pronta para o próximo passo" description="Os recursos desta seção serão adicionados nas próximas etapas do Lumio Dev." action={base !== '/configuracoes' && base !== '/importacao' && <Link className="button button--secondary" to={section.createPath}><Icon name="plus" />{section.action}</Link>} /></section></div>
}
