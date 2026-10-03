import type { IconName } from '../ui/Icon'

export const primaryNavigation: { label: string; path: string; icon: IconName }[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'grid' },
  { label: 'Prospecção', path: '/leads', icon: 'users' },
  { label: 'Clientes', path: '/clientes', icon: 'briefcase' },
  { label: 'Propostas', path: '/propostas', icon: 'file' },
  { label: 'Scripts', path: '/scripts', icon: 'message' },
  { label: 'Biblioteca', path: '/biblioteca', icon: 'book' },
  { label: 'Importação', path: '/importacao', icon: 'upload' },
]
