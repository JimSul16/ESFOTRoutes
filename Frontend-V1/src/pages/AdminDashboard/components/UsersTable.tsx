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
    <div className="overflow-x-auto bg-[#1e2333] rounded-xl shadow-lg border border-gray-700">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#161a26] text-gray-300 border-b border-gray-700">
            <th className="p-4 font-semibold">Nombre</th>
            <th className="p-4 font-semibold">Correo</th>
            <th className="p-4 font-semibold">Rol</th>
            <th className="p-4 font-semibold">Estado</th>
            <th className="p-4 font-semibold text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-8 text-center text-gray-400">
                No se encontraron usuarios o error de conexión con el servidor.
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className="border-b border-gray-700 hover:bg-[#252b3e] transition-colors">
                <td className="p-4 text-gray-200">{user.name}</td>
                <td className="p-4 text-gray-400">{user.email}</td>
                <td className="p-4 text-gray-300">{user.roles?.join(', ')}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium text-white ${user.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-4 text-right space-x-4">
                  <button
                    onClick={() => onEdit(user)}
                    className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onToggleStatus(user.id)}
                    className={`font-medium transition-colors ${user.isActive ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300'}`}
                  >
                    {user.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                  {user.isLocked ? (
                    <button
                      onClick={() => onUnlock(user.id)}
                      className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors ml-4"
                    >
                      Desbloquear
                    </button>
                  ) : null}
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