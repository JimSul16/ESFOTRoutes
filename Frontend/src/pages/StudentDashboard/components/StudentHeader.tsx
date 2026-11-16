import AppHeader from '../../../layouts/AppHeader';
import { useShell } from '../../../layouts/shellContext';
import type { UserDashboard } from '../../../types';

const StudentHeader = ({ userData }: { userData: UserDashboard }) => {
  const { openMobileNav } = useShell();

  return (
    <AppHeader
      title="Centro de Aprendizaje"
      badge="ESFOT • EPN"
      userData={userData}
      roleLabel={`Estudiante • Nvl. ${userData.level ?? 1}`}
      onOpenMenu={openMobileNav}
      profileImageAlt="Perfil"
    />
  );
};

export default StudentHeader;