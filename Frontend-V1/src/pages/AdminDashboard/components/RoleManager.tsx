import { useState, useEffect } from 'react';
import { getUsers } from '../../../api/admin.api';
import { Card, CardBody, Spinner } from '@/components/ui';

interface RoleInfo {
  description: string;
  color: string;
  bg: string;
}

/**
 * Incluye MODERATOR a propósito: es una tarjeta informativa del panel, aunque
 * ningún endpoint del backend reconoce ese rol, así que su contador siempre
 * sale en 0.
 */
const ROLE_INFO: Record<string, RoleInfo> = {
  ADMIN: { description: 'Acceso total al sistema', color: 'text-red-500', bg: 'bg-red-500/10' },
  STUDENT: { description: 'Acceso a rutas y editor de código', color: 'text-primary-500', bg: 'bg-primary-500/10' },
  MODERATOR: { description: 'Puede gestionar rutas pero no usuarios', color: 'text-accent-500', bg: 'bg-accent-500/10' },
};

interface RoleSummary {
  id: string;
  name: string;
  description: string;
  color: string;
  bg: string;
  users: number;
}

const RoleManager = () => {
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const users = await getUsers();

        const roleCounts: Record<string, number> = {};
        users.forEach((user) => {
          user.roles?.forEach((role) => {
            roleCounts[role] = (roleCounts[role] ?? 0) + 1;
          });
        });

        setRoles(
          Object.entries(ROLE_INFO).map(([name, info]) => ({
            id: name,
            name,
            description: info.description,
            color: info.color,
            bg: info.bg,
            users: roleCounts[name] ?? 0,
          }))
        );
      } catch (error: unknown) {
        console.error('Error al cargar roles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" className="text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-display font-bold text-surface-900 dark:text-white tracking-tight">
          Roles del sistema
        </h1>
        <p className="text-surface-500 dark:text-surface-400 mt-1">
          Distribución de usuarios por rol en la plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card key={role.id} className="relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 ${role.bg} rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity`} />
            <CardBody>
              <h3 className={`text-xl font-display font-semibold mb-2 ${role.color}`}>
                {role.name}
              </h3>
              <p className="text-surface-500 dark:text-surface-400 text-sm mb-6 min-h-[40px]">
                {role.description}
              </p>
              <div className="flex items-center justify-between border-t border-surface-100 dark:border-surface-800 pt-4">
                <span className="text-sm text-surface-600 dark:text-surface-300">
                  Usuarios: <span className="font-semibold text-surface-900 dark:text-white">{role.users}</span>
                </span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RoleManager;
