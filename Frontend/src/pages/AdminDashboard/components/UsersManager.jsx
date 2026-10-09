import { useState, useEffect } from 'react';
import { getUsers, toggleUserStatus, unlockUser } from '../../../api/admin.api';
import UsersTable from './UsersTable';
import UserFormModal from './UserFormModal';

const UsersManager = () => {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const token = sessionStorage.getItem('token');

  const fetchUsers = async () => {
    try {
      const data = await getUsers(token);
      setUsers(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (id) => {
    try {
      await toggleUserStatus(id, token);
      fetchUsers();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUnlockUser = async (id) => {
    try {
      await unlockUser(id, token);
      fetchUsers();
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenModal = (user = null) => {
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
        <h2 className="text-xl font-bold text-white">Gestión de Usuarios</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
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
          token={token}
        />
      )}
    </div>
  );
};

export default UsersManager;