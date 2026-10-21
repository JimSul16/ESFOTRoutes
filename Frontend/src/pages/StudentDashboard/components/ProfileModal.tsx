import { Modal } from '@/components/ui';
import StudentProfile from './StudentProfile';
import type { User, UserDashboard } from '../../../types';

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: UserDashboard;
  onPhotoUpdate: (newPhotoUrl: string) => void;
  onProfileUpdate?: (user: User) => void;
}

export const ProfileModal = ({
  isOpen,
  onClose,
  userData,
  onPhotoUpdate,
  onProfileUpdate,
}: ProfileModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Perfil de Usuario y Configuración"
      size="xl"
    >
      <div className="max-h-[78vh] overflow-y-auto pr-1">
        <StudentProfile
          userData={userData}
          onPhotoUpdate={onPhotoUpdate}
          onProfileUpdate={onProfileUpdate}
        />
      </div>
    </Modal>
  );
};

export default ProfileModal;
