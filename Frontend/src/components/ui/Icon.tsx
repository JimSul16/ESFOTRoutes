import type { IconBaseProps } from 'react-icons';
import {
  LuActivity,
  LuArrowLeft,
  LuArrowRight,
  LuAward,
  LuBookMarked,
  LuBookOpen,
  LuBot,
  LuBrain,
  LuCalendar,
  LuChartColumn,
  LuCheck,
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuCircleAlert,
  LuCircleCheck,
  LuCirclePlay,
  LuClock,
  LuCode,
  LuCompass,
  LuDownload,
  LuEllipsis,
  LuEllipsisVertical,
  LuExternalLink,
  LuEye,
  LuEyeOff,
  LuFileText,
  LuFlame,
  LuGauge,
  LuGraduationCap,
  LuHouse,
  LuImage,
  LuInfo,
  LuKeyRound,
  LuLayers,
  LuLayoutDashboard,
  LuLightbulb,
  LuListChecks,
  LuLock,
  LuLogOut,
  LuMail,
  LuMedal,
  LuMenu,
  LuMessageCircle,
  LuMinus,
  LuMoon,
  LuNetwork,
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuPencil,
  LuPlay,
  LuPlus,
  LuRefreshCw,
  LuRocket,
  LuRoute,
  LuSearch,
  LuSend,
  LuSettings,
  LuShield,
  LuSignal,
  LuSparkles,
  LuSprout,
  LuStar,
  LuSun,
  LuTarget,
  LuTrash2,
  LuTrendingDown,
  LuTrendingUp,
  LuTrophy,
  LuUpload,
  LuUser,
  LuUsers,
  LuX,
  LuZap,
} from 'react-icons/lu';

/**
 * Registro curado de iconos Lucide.
 *
 * Centralizar el registro evita que cada pantalla importe su propio set y
 * mezcle estilos (emojis, SVG inline, Material, Feather). Para agregar un
 * icono nuevo: impórtalo de `react-icons/lu`, regístralo aquí y úsalo por
 * nombre. El tamaño se controla con clases (`h-4 w-4`), igual que el resto
 * del sistema de diseño.
 */
const icons = {
  activity: LuActivity,
  arrowLeft: LuArrowLeft,
  arrowRight: LuArrowRight,
  award: LuAward,
  bookMarked: LuBookMarked,
  bookOpen: LuBookOpen,
  bot: LuBot,
  brain: LuBrain,
  calendar: LuCalendar,
  chartColumn: LuChartColumn,
  check: LuCheck,
  chevronDown: LuChevronDown,
  chevronLeft: LuChevronLeft,
  chevronRight: LuChevronRight,
  circleAlert: LuCircleAlert,
  circleCheck: LuCircleCheck,
  circlePlay: LuCirclePlay,
  clock: LuClock,
  code: LuCode,
  compass: LuCompass,
  download: LuDownload,
  ellipsis: LuEllipsis,
  ellipsisVertical: LuEllipsisVertical,
  externalLink: LuExternalLink,
  eye: LuEye,
  eyeOff: LuEyeOff,
  fileText: LuFileText,
  flame: LuFlame,
  gauge: LuGauge,
  graduationCap: LuGraduationCap,
  house: LuHouse,
  image: LuImage,
  info: LuInfo,
  keyRound: LuKeyRound,
  layers: LuLayers,
  layoutDashboard: LuLayoutDashboard,
  lightbulb: LuLightbulb,
  listChecks: LuListChecks,
  lock: LuLock,
  logOut: LuLogOut,
  mail: LuMail,
  medal: LuMedal,
  menu: LuMenu,
  messageCircle: LuMessageCircle,
  minus: LuMinus,
  moon: LuMoon,
  network: LuNetwork,
  panelLeftClose: LuPanelLeftClose,
  panelLeftOpen: LuPanelLeftOpen,
  pencil: LuPencil,
  play: LuPlay,
  plus: LuPlus,
  refreshCw: LuRefreshCw,
  rocket: LuRocket,
  route: LuRoute,
  search: LuSearch,
  send: LuSend,
  settings: LuSettings,
  shield: LuShield,
  signal: LuSignal,
  sparkles: LuSparkles,
  sprout: LuSprout,
  star: LuStar,
  sun: LuSun,
  target: LuTarget,
  trash: LuTrash2,
  trendingDown: LuTrendingDown,
  trendingUp: LuTrendingUp,
  trophy: LuTrophy,
  upload: LuUpload,
  user: LuUser,
  users: LuUsers,
  x: LuX,
  zap: LuZap,
} as const;

export type IconName = keyof typeof icons;

export interface IconProps extends IconBaseProps {
  /** Nombre del icono dentro del registro curado. */
  name: IconName;
}

/**
 * Icono decorativo por defecto.
 *
 * Todos los iconos del set son `aria-hidden`: el significado debe venir del
 * texto visible o del `aria-label` del control que los contiene. Si un icono
 * necesita descripción propia, pásale `aria-hidden={false}` junto con un
 * `<title>`.
 */
const Icon = ({ name, ...props }: IconProps) => {
  const Component = icons[name];

  return <Component aria-hidden="true" focusable="false" {...props} />;
};

export default Icon;
