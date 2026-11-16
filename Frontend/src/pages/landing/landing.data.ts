import type {
  FeatureItem,
  NavItem,
  PreviewModule,
  StatItem,
  StepItem,
  TeamMember,
} from './landing.types';

/**
 * Contenido de la landing page (Spec S2).
 *
 * Todo string visible de la página se declara aquí, una sola vez, para que
 * el markup de las secciones sea pura presentación. El copy se mantuvo
 * verbatim desde la versión original de `pages/Landing.tsx`.
 */

export const navItems: NavItem[] = [
  { label: 'Características', href: '#caracteristicas' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Equipo', href: '#equipo' },
];

export const hero = {
  eyebrow: 'Plataforma Oficial de Malla Curricular Adaptativa • ESFOT',
  titleLead: 'Domina tu malla curricular con',
  titleAccent: 'rutas de aprendizaje inteligentes',
  description:
    'La plataforma que transforma la preparación en materias de especialidad. Realiza un autodiagnóstico, visualiza prerrequisitos en grafos y avanza con el acompañamiento de un tutor con IA.',
  primaryCta: 'Comenzar ahora gratis',
  secondaryCta: 'Ver cómo funciona',
} as const;

export const preview = {
  windowLabel: 'Vista Previa de Ruta Adaptativa',
  routeBadge: 'Redes de Computadoras • Topológico',
  modules: [
    {
      tag: 'Módulo 1',
      status: '100% Completado',
      state: 'done',
      title: 'Fundamentos y Modelo OSI',
      body: 'Capas física, enlace y arquitectura TCP/IP.',
    },
    {
      tag: 'Módulo 2',
      status: '45% de avance',
      state: 'active',
      badge: 'En Curso',
      title: 'Direccionamiento IPv4 / Subnetting',
      body: 'Cálculo de máscaras VLSM y enrutamiento básico.',
    },
    {
      tag: 'Módulo 3',
      status: 'Prerrequisito Pendiente',
      state: 'locked',
      title: 'Enrutamiento Dinámico (OSPF)',
      body: 'Se habilitará al superar el reto práctico de IPv4.',
    },
  ] satisfies PreviewModule[],
} as const;

export const stats: StatItem[] = [
  { value: '50+', label: 'Rutas Curriculares' },
  { value: '200+', label: 'Recursos y Retos' },
  { value: '150+', label: 'Estudiantes ESFOT' },
  { value: '95%', label: 'Tasa de Comprensión', emphasis: true },
];

export const features = {
  title: 'Diseñado para la excelencia en ingeniería',
  description:
    'Todo lo necesario para comprender materias complejas mediante estructura, práctica guiada y diagnóstico continuo.',
  items: [
    {
      icon: 'graph',
      tone: 'brand',
      title: 'Rutas Curriculares Adaptativas',
      body: 'Organización mediante orden topológico sobre grafos de conocimiento. El algoritmo identifica tus temas débiles y prioriza prerrequisitos estrictos para que nunca te quedes atascado.',
      footer: 'Prerrequisitos y refuerzo pedagógico →',
    },
    {
      icon: 'tutor',
      tone: 'accent',
      title: 'Tutor Virtual Especializado con IA',
      body: 'Un asistente potenciado con Gemini e integrado al grafo académico. Resuelve dudas puntuales, evalúa tu código y genera explicaciones claras basadas en la malla oficial de la facultad.',
      footer: 'Evaluaciones teóricas y prácticas →',
    },
    {
      icon: 'progress',
      tone: 'primary',
      title: 'Progreso y Gamificación (XP)',
      body: 'Gana puntos de experiencia y sube de nivel al completar módulos y evaluaciones de código. Mantén el ritmo con rachas de estudio y métricas en tiempo real.',
      footer: 'Niveles, rachas y analíticas de estudio →',
    },
  ] satisfies FeatureItem[],
} as const;

export const process = {
  title: 'Cómo funciona tu camino de aprendizaje',
  description:
    'Tres etapas sencillas para transformar horas de estudio disperso en avance estructurado.',
  steps: [
    {
      step: '1',
      title: 'Diagnóstico de Conocimiento',
      body: 'Realiza una autoevaluación rápida en una escala del 1 al 5 en cada tema de la materia para mapear tus fortalezas y vacíos conceptuales.',
    },
    {
      step: '2',
      title: 'Generación Topológica',
      body: 'El motor de grafos calcula la ruta óptima de estudio, insertando módulos de refuerzo para temas con prerrequisitos no dominados.',
    },
    {
      step: '3',
      title: 'Estudio y Validación IA',
      body: 'Avanza a través de los recursos, resuelve retos en el editor de código integrado y obtén retroalimentación inmediata del asistente virtual.',
    },
  ] satisfies StepItem[],
} as const;

export const team = {
  title: 'Desarrollado en la ESFOT',
  description:
    'Iniciativa creada por estudiantes de Tecnología Superior en Desarrollo de Software (TSDS).',
  members: [
    {
      initials: 'JL',
      name: 'Jimmy Lucero',
      role: 'Desarrollo Backend',
      detail: 'APIs, Algoritmos de Grafos y Persistencia',
    },
    {
      initials: 'DC',
      name: 'David Cajamarca',
      role: 'Desarrollo Frontend',
      detail: 'Arquitectura React, UI/UX y Diseño SaaS',
    },
  ] satisfies TeamMember[],
} as const;

export const cta = {
  title: 'Potencia tu rendimiento académico',
  description:
    'Inicia sesión con tu cuenta institucional o crea tu usuario para comenzar tu primera ruta guiada.',
  button: 'Crear mi cuenta de estudiante',
} as const;

export const footer = {
  brand: 'ESFOT',
  institution: 'Escuela Politécnica Nacional',
  copyright:
    '© 2026 Proyecto de Titulación TSDS • Todos los derechos reservados.',
} as const;
