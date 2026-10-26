import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getUsers, toggleUserStatus, unlockUser } from '../../../api/admin.api';
import { getApiErrorMessage } from '../../../api/errors';
import UsersTable from './UsersTable';
import UserFormModal from './UserFormModal';
import type { User } from '../../../types';

const UsersManager = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      setUsers(await getUsers());
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'No se pudieron cargar los usuarios.'));
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await toggleUserStatus(id);
      toast.success(res.message);
      fetchUsers();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'No se pudo cambiar el estado del usuario.'));
    }
  };

  const handleUnlockUser = async (id: string) => {
    try {
      const res = await unlockUser(id);
      toast.success(res.message);
      fetchUsers();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'No se pudo desbloquear la cuenta.'));
    }
  };

  const handleOpenModal = (user: User | null = null) => {
    setUserToEdit(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setUserToEdit(null);
    setIsModalOpen(false);
    fetchUsers();
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-display font-bold text-surface-900 dark:text-white">Gestión de Usuarios</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-brand-600 text-white px-4 py-2.5 rounded-xl hover:bg-brand-500 transition-all shadow-md shadow-brand-600/20 hover:scale-[1.02] active:scale-[0.98] font-semibold text-sm"
        >
          Crear Usuario
        </button>
      </div>

      <UsersTable
        users={users}
        onEdit={handleOpenModal}
        onToggleStatus={handleToggleStatus}
        onUnlock={handleUnlockUser}
      />

      {isModalOpen && (
        <UserFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          userToEdit={userToEdit}
        />
      )}
    </div>
  );
};

export default UsersManager;