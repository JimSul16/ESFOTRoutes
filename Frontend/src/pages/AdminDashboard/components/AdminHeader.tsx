import AppHeader from '../../../layouts/AppHeader';
import { useShell } from '../../../layouts/shellContext';
import type { UserDashboard } from '../../../types';

const AdminHeader = ({ userData }: { userData: UserDashboard }) => {
  const { openMobileNav } = useShell();

  return (
    <AppHeader
      title="Centro de Administración"
      badge="ESFOT • EPN"
      userData={userData}
      roleLabel="Administrador"
      onOpenMenu={openMobileNav}
      profileImageAlt="Perfil Admin"
    />
  );
};

export default AdminHeader;