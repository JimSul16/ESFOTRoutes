import type { NavItem } from '@/layouts/nav.types';
import type { AdminTab } from './AdminSidebar';

interface AdminNavItem extends NavItem {
  tab: AdminTab;
}

/**
 * Navegación del panel de administración.
 *
 * Incluye todas las pestañas reales (antes `constructor`, `roles` y `perfil`
 * no tenían entrada en la barra lateral y solo se alcanzaban desde la
 * cabecera o por accidente). `primary: false` las deja solo en el drawer.
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    tab: 'inicio',
    label: 'Resumen Operativo',
    shortLabel: 'Resumen',
    icon: 'layoutDashboard',
  },
  {
    tab: 'usuarios',
    label: 'Gestión de Usuarios',
    shortLabel: 'Usuarios',
    icon: 'users',
  },
  {
    tab: 'recursos',
    label: 'Gestión de Recursos',
    shortLabel: 'Recursos',
    icon: 'bookOpen',
    primary: false,
  },
  {
    tab: 'rutas',
    label: 'Rutas de Aprendizaje',
    shortLabel: 'Rutas',
    icon: 'route',
  },
  {
    tab: 'constructor',
    label: 'Constructor de Rutas',
    shortLabel: 'Constructor',
    icon: 'pencil',
    primary: false,
  },
  {
    tab: 'perfil',
    label: 'Mi Perfil',
    shortLabel: 'Perfil',
    icon: 'user',
  },
];
