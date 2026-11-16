import type { NavItem } from '@/layouts/nav.types';
import type { StudentTab } from '../index';

interface StudentNavItem extends NavItem {
  tab: StudentTab;
}

/**
 * Navegación del panel del estudiante.
 *
 * Las etiquetas cortas de la barra inferior no repiten las completas de la
 * barra lateral: así cada control tiene un nombre accesible distinto y la
 * barra cabe en 360 px.
 */
export const STUDENT_NAV_ITEMS: StudentNavItem[] = [
  {
    tab: 'inicio',
    label: 'Centro de Mando',
    shortLabel: 'Inicio',
    icon: 'layoutDashboard',
  },
  {
    tab: 'explorar',
    label: 'Explorar Rutas',
    shortLabel: 'Explorar',
    icon: 'compass',
  },
  {
    tab: 'mis-rutas',
    label: 'Mis Rutas',
    shortLabel: 'Rutas',
    icon: 'route',
  },
  {
    tab: 'recursos',
    label: 'Catálogo de Recursos',
    shortLabel: 'Recursos',
    icon: 'bookOpen',
  },
  {
    tab: 'analytics',
    label: 'Analítica',
    shortLabel: 'Métricas',
    icon: 'chartColumn',
  },
  {
    tab: 'perfil',
    label: 'Mi Perfil',
    shortLabel: 'Perfil',
    icon: 'user',
  },
];
