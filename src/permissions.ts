import { AppAction, Page, Role, User } from './types';

const ROLE_WEIGHT: Record<Role, number> = {
  OBSERVATEUR: 0,
  PRESTATAIRE: 1,
  FORMATEUR: 2,
  CHEF_PROJET: 3,
  ADMIN: 4,
};

export type Permission =
  | 'module:write'
  | 'task:write'
  | 'document:create'
  | 'document:delete'
  | 'poll:create'
  | 'poll:moderate'
  | 'budget:write'
  | 'settings:write'
  | 'ai:use';

const MIN_ROLE_BY_PERMISSION: Record<Permission, Role> = {
  'module:write': 'CHEF_PROJET',
  'task:write': 'FORMATEUR',
  'document:create': 'FORMATEUR',
  'document:delete': 'CHEF_PROJET',
  'poll:create': 'FORMATEUR',
  'poll:moderate': 'CHEF_PROJET',
  'budget:write': 'CHEF_PROJET',
  'settings:write': 'ADMIN',
  'ai:use': 'FORMATEUR',
};

export function hasRoleAtLeast(role: Role | undefined, minRole: Role): boolean {
  if (!role) return false;
  return ROLE_WEIGHT[role] >= ROLE_WEIGHT[minRole];
}

export function can(user: User | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  return hasRoleAtLeast(user.role, MIN_ROLE_BY_PERMISSION[permission]);
}

export function canAccessPage(user: User | null | undefined, page: Page): boolean {
  if (!user) return false;
  if (page === 'settings') return can(user, 'settings:write');
  if (page === 'budget') return hasRoleAtLeast(user.role, 'CHEF_PROJET');
  return true;
}

export function canExecuteAction(user: User | null | undefined, action: AppAction): boolean {
  if (['SET_CONFIG', 'SET_USER', 'MARK_CHANNEL_READ'].includes(action.type)) return true;
  switch (action.type) {
    case 'ADD_MODULE':
    case 'UPDATE_MODULE':
    case 'DELETE_MODULE':
      return can(user, 'module:write');
    case 'ADD_TASK':
    case 'UPDATE_TASK':
    case 'UPDATE_TASK_STATUS':
    case 'DELETE_TASK':
      return can(user, 'task:write');
    case 'ADD_DOCUMENT':
      return can(user, 'document:create');
    case 'DELETE_DOCUMENT':
      return can(user, 'document:delete');
    case 'ADD_POLL':
      return can(user, 'poll:create');
    case 'CLOSE_POLL':
    case 'DELETE_POLL':
      return can(user, 'poll:moderate');
    case 'VOTE_POLL':
    case 'ADD_MESSAGE':
      return Boolean(user);
    default:
      return true;
  }
}

export function roleLabel(role?: Role): string {
  switch (role) {
    case 'ADMIN': return 'Administrateur';
    case 'CHEF_PROJET': return 'Chef de projet';
    case 'FORMATEUR': return 'Formateur';
    case 'PRESTATAIRE': return 'Prestataire';
    case 'OBSERVATEUR': return 'Observateur';
    default: return 'Non connecté';
  }
}
