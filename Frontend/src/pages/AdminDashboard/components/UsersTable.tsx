import type { User } from '../../../types';

export interface UsersTableProps {
  users: User[];
  onEdit: (user: User) => void;
  /** El id llega como string porque `getUsers()` devuelve `User[]`. */
  onToggleStatus: (id: string) => void;
  onUnlock: (id: string) => void;
}

const UsersTable = ({ users, onEdit, onToggleStatus, onUnlock }: UsersTableProps) => {
  return (
    <div className="overflow-x-auto bg-white dark:bg-surface-900 rounded-2xl shadow-sm border border-surface-200 dark:border-surface-800">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-300 border-b border-surface-200 dark:border-surface-800">
            <th className="p-4 font-semibold text-sm">Nombre</th>
            <th className="p-4 font-semibold text-sm">Correo</th>
            <th className="p-4 font-semibold text-sm">Rol</th>
            <th className="p-4 font-semibold text-sm">Estado</th>
            <th className="p-4 font-semibold text-sm text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-8 text-center text-surface-500 dark:text-surface-400">
                No se encontraron usuarios o error de conexión con el servidor.
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className="border-b border-surface-200/50 dark:border-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800/50 transition-colors">
                <td className="p-4 text-surface-800 dark:text-surface-200 font-medium">{user.name}</td>
                <td className="p-4 text-surface-500 dark:text-surface-400">{user.email}</td>
                <td className="p-4 text-surface-600 dark:text-surface-300">{user.roles?.join(', ')}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60'}`}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(user)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/40 border border-brand-200/60 dark:border-brand-800/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Editar
                    </button>
                    <button
                      onClick={() => onToggleStatus(user.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:scale-[1.02] active:scale-[0.98] ${
                        user.isActive
                          ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border-rose-200/60 dark:border-rose-800/40'
                          : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-emerald-200/60 dark:border-emerald-800/40'
                      }`}
                    >
                      {user.isActive ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                          Desactivar
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Activar
                        </>
                      )}
                    </button>
                    {user.isLocked ? (
                      <button
                        onClick={() => onUnlock(user.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-950/40 hover:bg-accent-100 dark:hover:bg-accent-900/40 border border-accent-200/60 dark:border-accent-800/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                        Desbloquear
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UsersTable;