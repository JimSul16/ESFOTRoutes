import { useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  Input,
  Skeleton,
} from '@/components/ui';
import { getRoleLabel, getRoleTone } from '@/utils/uiMaps';
import type { User } from '../../../types';

export interface UsersTableProps {
  users: User[];
  onEdit: (user: User) => void;
  /** El id llega como string porque `getUsers()` devuelve `User[]`. */
  onToggleStatus: (id: string) => void;
  onUnlock: (id: string) => void;
  onViewProgress?: (user: User) => void;
  loading?: boolean;
  /** Acción del estado vacío; sin ella solo se muestra el mensaje. */
  onCreate?: () => void;
}

type RoleFilter = 'all' | 'ADMIN' | 'STUDENT';
type StatusFilter = 'all' | 'active' | 'inactive';

const UsersTable = ({
  users,
  onEdit,
  onToggleStatus,
  onUnlock,
  onViewProgress,
  loading = false,
  onCreate,
}: UsersTableProps) => {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return users.filter((user) => {
      const matchesQuery =
        !needle ||
        user.name.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle) ||
        (user.uniqueId && user.uniqueId.toLowerCase().includes(needle));

      const matchesRole = roleFilter === 'all' || user.roles?.includes(roleFilter);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? Boolean(user.isActive) : !user.isActive);

      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [users, query, roleFilter, statusFilter]);

  const hasFilters = query.trim() !== '' || roleFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
  };

  if (loading) {
    return (
      <Card padding="none" aria-busy="true" className="overflow-hidden">
        <span className="sr-only">Cargando usuarios…</span>
        <div className="border-b border-surface-100 px-5 py-4 dark:border-surface-800">
          <Skeleton className="h-9 w-full max-w-sm" />
        </div>
        <ul className="divide-y divide-surface-100 dark:divide-surface-800">
          {[0, 1, 2, 3, 4].map((index) => (
            <li key={index} className="flex items-center gap-4 px-5 py-4">
              <Skeleton variant="circle" className="h-9 w-9 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="w-1/3" />
                <Skeleton className="w-1/2 max-w-xs" />
              </div>
              <Skeleton className="hidden h-6 w-24 sm:block" />
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Card padding="none">
        <EmptyState
          icon="users"
          title="Todavía no hay usuarios registrados"
          description="Crea la primera cuenta para empezar a gestionar estudiantes y administradores."
          action={
            onCreate ? (
              <Button
                type="button"
                onClick={onCreate}
                iconLeft={<Icon name="plus" className="h-4 w-4" />}
              >
                Crear usuario
              </Button>
            ) : undefined
          }
        />
      </Card>
    );
  }

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Filtros */}
      <div className="flex flex-col gap-3 border-b border-surface-100 p-4 dark:border-surface-800 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o correo…"
            aria-label="Buscar usuarios"
            containerClassName="sm:max-w-xs"
          />

          <div className="flex items-center gap-2.5">
            <label className="sr-only" htmlFor="users-role-filter">
              Filtrar por rol
            </label>
            <select
              id="users-role-filter"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
              className="h-[42px] rounded-control border border-surface-200 bg-surface-50 px-3 text-sm text-surface-700 transition-colors focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-focus/25 dark:border-surface-700 dark:bg-surface-800/60 dark:text-surface-200"
            >
              <option value="all">Todos los roles</option>
              <option value="STUDENT">Estudiantes</option>
              <option value="ADMIN">Administradores</option>
            </select>

            <label className="sr-only" htmlFor="users-status-filter">
              Filtrar por estado
            </label>
            <select
              id="users-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-[42px] rounded-control border border-surface-200 bg-surface-50 px-3 text-sm text-surface-700 transition-colors focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-focus/25 dark:border-surface-700 dark:bg-surface-800/60 dark:text-surface-200"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>

        <p className="shrink-0 text-xs tabular-nums text-surface-500 dark:text-surface-400">
          {filteredUsers.length} de {users.length} {users.length === 1 ? 'usuario' : 'usuarios'}
        </p>
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState
          icon="search"
          title="Sin resultados"
          description="Ningún usuario coincide con la búsqueda o los filtros aplicados."
          action={
            <Button type="button" variant="secondary" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <thead>
              <tr className="bg-surface-50 text-2xs uppercase tracking-wider text-surface-500 dark:bg-surface-850 dark:text-surface-400">
                <th scope="col" className="px-5 py-3 font-semibold">
                  Usuario
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  ID Único EPN
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Rol
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Estado
                </th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/40"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} size="sm" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100">
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-surface-500 dark:text-surface-400">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-surface-700 dark:text-surface-300">
                      {user.uniqueId || '—'}
                    </span>
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {(user.roles?.length ? user.roles : ['']).map((role, index) => (
                        <Badge
                          key={`${user.id}-${role || index}`}
                          variant={getRoleTone(role)}
                          size="sm"
                        >
                          {getRoleLabel(role) || 'Sin rol'}
                        </Badge>
                      ))}
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={user.isActive ? 'default' : 'accent'}
                        size="sm"
                        dot
                      >
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                      {user.isLocked && (
                        <Badge variant="warning" size="sm">
                          Bloqueado
                        </Badge>
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      {onViewProgress && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewProgress(user)}
                          aria-label={`Ver progreso de ${user.name}`}
                          iconLeft={<Icon name="chartColumn" className="h-3.5 w-3.5" />}
                        >
                          Progreso
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(user)}
                        aria-label={`Editar a ${user.name}`}
                        iconLeft={<Icon name="pencil" className="h-3.5 w-3.5" />}
                      >
                        Editar
                      </Button>

                      <Button
                        type="button"
                        variant={user.isActive ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={() => onToggleStatus(user.id)}
                        aria-label={`${user.isActive ? 'Desactivar' : 'Activar'} a ${user.name}`}
                        iconLeft={
                          <Icon
                            name={user.isActive ? 'x' : 'check'}
                            className="h-3.5 w-3.5"
                          />
                        }
                      >
                        {user.isActive ? 'Desactivar' : 'Activar'}
                      </Button>

                      {user.isLocked && (
                        <Button
                          type="button"
                          variant="accent"
                          size="sm"
                          onClick={() => onUnlock(user.id)}
                          aria-label={`Desbloquear a ${user.name}`}
                          iconLeft={<Icon name="keyRound" className="h-3.5 w-3.5" />}
                        >
                          Desbloquear
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasFilters && filteredUsers.length > 0 && (
        <div className="border-t border-surface-100 px-5 py-3 dark:border-surface-800">
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </div>
      )}
    </Card>
  );
};

export default UsersTable;
