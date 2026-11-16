import { useEffect, useState } from 'react';
import { Badge, Icon } from '@/components/ui';
import ProfileScreen, {
  type ProfileBadge,
  type ProfileStat,
} from '@/components/profile/ProfileScreen';
import { getMyProgress, type MyProgress } from '../../../api/auth.api';
import type { User, UserDashboard } from '../../../types';

export interface StudentProfileProps {
  userData: UserDashboard;
  onPhotoUpdate: (newPhotoUrl: string) => void;
  /** Avisa al dashboard para que refresque el perfil tras editarlo. */
  onProfileUpdate?: (user: User) => void;
}

const StudentProfile = ({ userData, onPhotoUpdate, onProfileUpdate }: StudentProfileProps) => {
  const [progressData, setProgressData] = useState<MyProgress | null>(null);

  useEffect(() => {
    let cancelled = false;

    getMyProgress()
      .then((res) => {
        if (!cancelled) setProgressData(res);
      })
      .catch(() => {
        // Fallback a los datos en sesión si falla
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const points = progressData?.points ?? userData.xp ?? 0;
  const streak = progressData?.streak ?? userData.streak ?? 0;
  const level = progressData?.level ?? userData.level ?? 1;

  const badges: ProfileBadge[] = [
    {
      name: 'Primera ruta',
      earned: points > 0,
      icon: 'epnOwl',
      description: 'El primer paso de tu trayectoria de aprendizaje.',
    },
    {
      name: 'Racha de 7 días',
      earned: streak >= 7,
      icon: 'flame',
      description: 'Constancia de siete días seguidos.',
    },
    {
      name: 'Explorador',
      earned: points >= 500,
      icon: 'brain',
      description: 'Exploración de contenidos hasta 500 pts de progreso.',
    },
    {
      name: 'Nivel 5',
      earned: level >= 5,
      icon: 'epnLaurel',
      description: 'Distinción por alcanzar el nivel 5.',
    },
  ];

  const stats: ProfileStat[] = [
    { label: 'Progreso total', value: `${points} pts` },
    { label: 'Nivel', value: level },
    { label: 'Racha', value: `${streak} días` },
    ...(progressData
      ? [
          {
            label: 'Módulos aprobados',
            value: `${progressData.modulesPassed} / ${progressData.modulesCompleted}`,
          },
        ]
      : []),
  ];

  return (
    <ProfileScreen
      userData={userData}
      onPhotoUpdate={onPhotoUpdate}
      onProfileUpdate={onProfileUpdate}
      eyebrow="Aprendizaje"
      badges={badges}
      stats={stats}
      showLevelProgress
      showXpField
      headerBadges={
        <>
          <Badge variant="brand">Estudiante EPN</Badge>
          <Badge variant="default">Nivel {level}</Badge>
          {streak > 0 && (
            <Badge variant="accent">
              <Icon name="flame" className="h-3 w-3" />
              {streak} días de racha
            </Badge>
          )}
        </>
      }
    />
  );
};

export default StudentProfile;
