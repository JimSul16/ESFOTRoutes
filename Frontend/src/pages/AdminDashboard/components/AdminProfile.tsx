import { Badge } from '@/components/ui';
import ProfileScreen, {
  type ProfileBadge,
  type ProfileStat,
} from '@/components/profile/ProfileScreen';
import type { User, UserDashboard } from '../../../types';

export interface AdminProfileProps {
  userData: UserDashboard;
  onPhotoUpdate: (newPhotoUrl: string) => void;
  /** Avisa al dashboard para que refresque el perfil tras editarlo. */
  onProfileUpdate?: (user: User) => void;
}

const badges: ProfileBadge[] = [
  {
    name: 'Acceso Total',
    earned: true,
    icon: 'epnOwl',
    description: 'Control completo de la plataforma.',
  },
  {
    name: 'Gestión Admin',
    earned: true,
    icon: 'epnLaurel',
    description: 'Administración de recursos y usuarios.',
  },
  {
    name: 'Grafos IA',
    earned: true,
    icon: 'brain',
    description: 'Supervisión del conocimiento con IA.',
  },
  {
    name: 'Nivel Superior',
    earned: true,
    icon: 'shield',
    description: 'Privilegios máximos del sistema.',
  },
];

const AdminProfile = ({ userData, onPhotoUpdate, onProfileUpdate }: AdminProfileProps) => {
  const stats: ProfileStat[] = [
    { label: 'Rol', value: userData.primaryRole },
    { label: 'Acceso', value: 'Total' },
  ];

  return (
    <ProfileScreen
      userData={userData}
      onPhotoUpdate={onPhotoUpdate}
      onProfileUpdate={onProfileUpdate}
      eyebrow="Administración"
      badges={badges}
      stats={stats}
      headerBadges={
        <>
          <Badge variant="brand">Administrador EPN</Badge>
          <Badge variant="default">Acceso Total</Badge>
        </>
      }
    />
  );
};

export default AdminProfile;
