import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Button, Icon, PageHeader } from '@/components/ui';
import { getUsers, toggleUserStatus, unlockUser } from '../../../api/admin.api';
import { getApiErrorMessage } from '../../../api/errors';
import UsersTable from './UsersTable';
import UserFormModal from './UserFormModal';
import UserProgressModal from './UserProgressModal';
import type { User } from '../../../types';

const UsersManager = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [selectedUserForProgress, setSelectedUserForProgress] = useState<User | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchUsers = async () => {
      try {
        const data = await getUsers();
        if (!cancelled) setUsers(data);
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, 'No se pudieron cargar los usuarios.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchUsers();

    return () => {
      cancelled = true;
    };
    // `reloadKey` solo dispara el refresco tras una mutación.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [reloadKey]);

  const refreshUsers = () => setReloadKey((key) => key + 1);

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await toggleUserStatus(id);
      toast.success(res.message);
      refreshUsers();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'No se pudo cambiar el estado del usuario.'));
    }
  };

  const handleUnlockUser = async (id: string) => {
    try {
      const res = await unlockUser(id);
      toast.success(res.message);
      refreshUsers();
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
    refreshUsers();
  };

  return (
    <div className="animate-in fade-in mx-auto max-w-6xl space-y-6 pb-12 duration-300 sm:space-y-8">
      <PageHeader
        eyebrow="Administración"
        title="Gestión de Usuarios"
        description="Revisa las cuentas de la plataforma, ajusta sus roles y controla el acceso."
        actions={
          <Button
            type="button"
            onClick={() => handleOpenModal()}
            iconLeft={<Icon name="plus" className="h-4 w-4" />}
          >
            Crear Usuario
          </Button>
        }
      />

      <UsersTable
        users={users}
        loading={loading}
        onEdit={handleOpenModal}
        onToggleStatus={handleToggleStatus}
        onUnlock={handleUnlockUser}
        onViewProgress={(u) => setSelectedUserForProgress(u)}
        onCreate={() => handleOpenModal()}
      />

      {isModalOpen && (
        <UserFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          userToEdit={userToEdit}
        />
      )}

      {selectedUserForProgress && (
        <UserProgressModal
          isOpen={Boolean(selectedUserForProgress)}
          onClose={() => setSelectedUserForProgress(null)}
          user={selectedUserForProgress}
        />
      )}
    </div>
  );
};

export default UsersManager;
