import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

type Theme = 'light' | 'dark';

/** Solo acepta 'dark'; cualquier otro valor guardado cae a 'light'. */
const readStoredTheme = (): Theme => (localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');

const Landing = () => {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 font-sans text-surface-900 dark:text-surface-50 transition-colors duration-300 antialiased selection:bg-brand-500/20 selection:text-brand-600">

      {/* Navbar Superior */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-surface-950/80 backdrop-blur-xl border-b border-surface-200/80 dark:border-surface-800/80">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-18 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-800 text-white flex items-center justify-center font-bold font-display text-base shadow-sm ring-2 ring-brand-500/20">
              EPN
            </div>
            <div>
              <span className="text-xl font-display font-bold tracking-tight text-surface-900 dark:text-white">
                Rutas <span className="text-brand-600 dark:text-brand-400">ESFOT</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border border-surface-200 dark:border-surface-700">
                v3.0 SaaS
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-surface-600 dark:text-surface-300">
            <a href="#caracteristicas" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              Características
            </a>
            <a href="#como-funciona" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              Cómo funciona
            </a>
            <a href="#equipo" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              Equipo
            </a>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-surface-100 dark:bg-surface-850 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-800 transition-all border border-surface-200/60 dark:border-surface-700/60 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              aria-label="Cambiar tema visual"
            >
              {theme === 'light' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              )}
            </button>
            <Link
              to="/login"
              className="hidden sm:inline-flex text-sm font-semibold text-surface-700 dark:text-surface-200 hover:text-brand-600 dark:hover:text-brand-400 px-3 py-2 transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-20 pb-20 md:pt-28 md:pb-28 px-6 md:px-10 overflow-hidden">
          {/* Fondo con brillo ambiental sutil */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-brand-500/10 via-rose-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

          <div className="max-w-5xl mx-auto text-center">
            {/* Pill de anuncio */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200/80 dark:border-brand-800/60 text-brand-700 dark:text-brand-300 text-xs font-semibold mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              <span>Plataforma Oficial de Malla Curricular Adaptativa • ESFOT</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold tracking-tight text-surface-900 dark:text-white leading-[1.1] mb-6">
              Domina tu malla curricular con{' '}
              <span className="bg-gradient-to-r from-brand-600 via-rose-500 to-brand-400 bg-clip-text text-transparent">
                rutas de aprendizaje inteligentes
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-surface-600 dark:text-surface-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              La plataforma que transforma la preparación en materias de especialidad. Realiza un autodiagnóstico, visualiza prerrequisitos en grafos y avanza con el acompañamiento de un tutor con IA.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
              <Link
                to="/register"
                className="w-full sm:w-auto bg-brand-600 hover:bg-brand-500 text-white font-semibold text-base px-8 py-3.5 rounded-xl shadow-lg shadow-brand-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
              >
                <span>Comenzar ahora gratis</span>
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              <a
                href="#como-funciona"
                className="w-full sm:w-auto bg-white dark:bg-surface-900 text-surface-700 dark:text-surface-200 border border-surface-200 dark:border-surface-800 hover:bg-surface-100 dark:hover:bg-surface-850 font-semibold text-base px-8 py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center"
              >
                Ver cómo funciona
              </a>
            </div>

            {/* Mockup Interactivo del Grafo de Conocimiento */}
            <div className="relative mx-auto max-w-4xl rounded-2xl p-2 bg-gradient-to-b from-surface-200/60 via-surface-100/40 to-transparent dark:from-surface-800/80 dark:via-surface-900/40 border border-surface-200 dark:border-surface-800 shadow-2xl">
              <div className="bg-white dark:bg-surface-900 rounded-xl p-6 sm:p-8 text-left border border-surface-100 dark:border-surface-800">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-100 dark:border-surface-800 pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="text-xs font-medium text-surface-400 ml-2">Vista Previa de Ruta Adaptativa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                      Redes de Computadoras • Topológico
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-850 border border-surface-200 dark:border-surface-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">Módulo 1</span>
                      <span className="text-xs text-emerald-600 font-bold">100% Completado</span>
                    </div>
                    <h4 className="text-sm font-bold text-surface-900 dark:text-white">Fundamentos y Modelo OSI</h4>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">Capas física, enlace y arquitectura TCP/IP.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-brand-50/60 dark:bg-brand-950/30 border-2 border-brand-500/40 shadow-sm relative">
                    <span className="absolute -top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-600 text-white">
                      En Curso
                    </span>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">Módulo 2</span>
                      <span className="text-xs text-brand-600 font-bold">45% de avance</span>
                    </div>
                    <h4 className="text-sm font-bold text-surface-900 dark:text-white">Direccionamiento IPv4 / Subnetting</h4>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">Cálculo de máscaras VLSM y enrutamiento básico.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-50/50 dark:bg-surface-850/50 border border-dashed border-surface-300 dark:border-surface-700 opacity-70">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-surface-400">Módulo 3</span>
                      <span className="text-xs text-surface-400">Prerrequisito Pendiente</span>
                    </div>
                    <h4 className="text-sm font-bold text-surface-900 dark:text-white">Enrutamiento Dinámico (OSPF)</h4>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">Se habilitará al superar el reto práctico de IPv4.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Barra de Estadísticas de Impacto */}
        <section className="py-12 px-6 md:px-10 bg-white dark:bg-surface-900 border-y border-surface-200 dark:border-surface-800">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-surface-200 dark:divide-surface-800">
              <div className="pt-4 md:pt-0">
                <div className="text-3xl md:text-4xl font-display font-extrabold text-brand-600 dark:text-brand-400 mb-1">
                  50+
                </div>
                <div className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  Rutas Curriculares
                </div>
              </div>
              <div className="pt-4 md:pt-0">
                <div className="text-3xl md:text-4xl font-display font-extrabold text-brand-600 dark:text-brand-400 mb-1">
                  200+
                </div>
                <div className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  Recursos y Retos
                </div>
              </div>
              <div className="pt-4 md:pt-0">
                <div className="text-3xl md:text-4xl font-display font-extrabold text-brand-600 dark:text-brand-400 mb-1">
                  150+
                </div>
                <div className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  Estudiantes ESFOT
                </div>
              </div>
              <div className="pt-4 md:pt-0">
                <div className="text-3xl md:text-4xl font-display font-extrabold text-emerald-600 dark:text-emerald-400 mb-1">
                  95%
                </div>
                <div className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  Tasa de Comprensión
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Características Principales */}
        <section id="caracteristicas" className="py-24 px-6 md:px-10 bg-surface-50 dark:bg-surface-950">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-surface-900 dark:text-white tracking-tight mb-4">
                Diseñado para la excelencia en ingeniería
              </h2>
              <p className="text-surface-600 dark:text-surface-300 max-w-2xl mx-auto text-base">
                Todo lo necesario para comprender materias complejas mediante estructura, práctica guiada y diagnóstico continuo.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Card 1 */}
              <div className="bg-white dark:bg-surface-900 p-8 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm hover:shadow-md hover:border-brand-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-6 border border-brand-200/60 dark:border-brand-800/40">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                  </div>
                  <h3 className="text-xl font-display font-bold text-surface-900 dark:text-white mb-2">
                    Rutas Curriculares Adaptativas
                  </h3>
                  <p className="text-surface-600 dark:text-surface-400 text-sm leading-relaxed">
                    Organización mediante orden topológico sobre grafos de conocimiento. El algoritmo identifica tus temas débiles y prioriza prerrequisitos estrictos para que nunca te quedes atascado.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-surface-100 dark:border-surface-800 text-xs font-semibold text-brand-600 dark:text-brand-400">
                  Prerrequisitos y refuerzo pedagógico →
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-white dark:bg-surface-900 p-8 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm hover:shadow-md hover:border-amber-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6 border border-amber-200/60 dark:border-amber-800/40">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </div>
                  <h3 className="text-xl font-display font-bold text-surface-900 dark:text-white mb-2">
                    Tutor Virtual Especializado con IA
                  </h3>
                  <p className="text-surface-600 dark:text-surface-400 text-sm leading-relaxed">
                    Un asistente potenciado con Gemini e integrado al grafo académico. Resuelve dudas puntuales, evalúa tu código y genera explicaciones claras basadas en la malla oficial de la facultad.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-surface-100 dark:border-surface-800 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Evaluaciones teóricas y prácticas →
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-white dark:bg-surface-900 p-8 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 border border-emerald-200/60 dark:border-emerald-800/40">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </div>
                  <h3 className="text-xl font-display font-bold text-surface-900 dark:text-white mb-2">
                    Progreso y Gamificación (XP)
                  </h3>
                  <p className="text-surface-600 dark:text-surface-400 text-sm leading-relaxed">
                    Gana puntos de experiencia y sube de nivel al completar módulos y evaluaciones de código. Mantén el ritmo con rachas de estudio y métricas en tiempo real.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-surface-100 dark:border-surface-800 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Niveles, rachas y analíticas de estudio →
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cómo Funciona */}
        <section id="como-funciona" className="py-24 px-6 md:px-10 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-surface-900 dark:text-white tracking-tight mb-4">
                Cómo funciona tu camino de aprendizaje
              </h2>
              <p className="text-surface-600 dark:text-surface-300 max-w-2xl mx-auto text-base">
                Tres etapas sencillas para transformar horas de estudio disperso en avance estructurado.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="p-8 rounded-2xl bg-surface-50 dark:bg-surface-850 border border-surface-200 dark:border-surface-800 text-left">
                <div className="w-10 h-10 rounded-xl bg-brand-600 text-white font-display font-bold text-base flex items-center justify-center mb-6">
                  1
                </div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">Diagnóstico de Conocimiento</h3>
                <p className="text-surface-600 dark:text-surface-400 text-sm leading-relaxed">
                  Realiza una autoevaluación rápida en una escala del 1 al 5 en cada tema de la materia para mapear tus fortalezas y vacíos conceptuales.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-surface-50 dark:bg-surface-850 border border-surface-200 dark:border-surface-800 text-left">
                <div className="w-10 h-10 rounded-xl bg-brand-600 text-white font-display font-bold text-base flex items-center justify-center mb-6">
                  2
                </div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">Generación Topológica</h3>
                <p className="text-surface-600 dark:text-surface-400 text-sm leading-relaxed">
                  El motor de grafos calcula la ruta óptima de estudio, insertando módulos de refuerzo para temas con prerrequisitos no dominados.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-surface-50 dark:bg-surface-850 border border-surface-200 dark:border-surface-800 text-left">
                <div className="w-10 h-10 rounded-xl bg-brand-600 text-white font-display font-bold text-base flex items-center justify-center mb-6">
                  3
                </div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">Estudio y Validación IA</h3>
                <p className="text-surface-600 dark:text-surface-400 text-sm leading-relaxed">
                  Avanza a través de los recursos, resuelve retos en el editor de código integrado y obtén retroalimentación inmediata del asistente virtual.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Sección de Equipo */}
        <section id="equipo" className="py-24 px-6 md:px-10 bg-surface-50 dark:bg-surface-950 border-t border-surface-200 dark:border-surface-800">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-surface-900 dark:text-white tracking-tight mb-4">
                Desarrollado en la ESFOT
              </h2>
              <p className="text-surface-600 dark:text-surface-300 max-w-2xl mx-auto text-base">
                Iniciativa creada por estudiantes de Tecnología Superior en Desarrollo de Software (TSDS).
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="bg-white dark:bg-surface-900 p-6 rounded-2xl border border-surface-200 dark:border-surface-800 text-center shadow-sm hover:shadow-md hover:border-brand-500/40 transition-all">
                <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-4 font-display font-bold text-lg border border-brand-200/60 dark:border-brand-800/40 shadow-2xs">
                  JL
                </div>
                <h4 className="font-display font-bold text-surface-900 dark:text-white text-lg">Jimmy Lucero</h4>
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-1 uppercase tracking-wider">Desarrollo Backend</p>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">APIs, Algoritmos de Grafos y Persistencia</p>
              </div>

              <div className="bg-white dark:bg-surface-900 p-6 rounded-2xl border border-surface-200 dark:border-surface-800 text-center shadow-sm hover:shadow-md hover:border-brand-500/40 transition-all">
                <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-4 font-display font-bold text-lg border border-brand-200/60 dark:border-brand-800/40 shadow-2xs">
                  DC
                </div>
                <h4 className="font-display font-bold text-surface-900 dark:text-white text-lg">David Cajamarca</h4>
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-1 uppercase tracking-wider">Desarrollo Frontend</p>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">Arquitectura React, UI/UX y Diseño SaaS</p>
              </div>
            </div>
          </div>
        </section>

        {/* Banner CTA Final */}
        <section className="py-20 px-6 md:px-10 bg-gradient-to-tr from-brand-950 via-surface-900 to-surface-950 text-white text-center relative overflow-hidden">
          <div className="max-w-3xl mx-auto relative z-10">
            <h2 className="text-3xl md:text-5xl font-display font-extrabold mb-6 tracking-tight">
              Potencia tu rendimiento académico
            </h2>
            <p className="text-base md:text-lg text-surface-300 mb-10 leading-relaxed">
              Inicia sesión con tu cuenta institucional o crea tu usuario para comenzar tu primera ruta guiada.
            </p>
            <Link
              to="/register"
              className="inline-flex bg-white hover:bg-surface-100 text-surface-950 font-bold px-8 py-3.5 rounded-xl shadow-xl transition-all hover:scale-105"
            >
              Crear mi cuenta de estudiante
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-950 text-surface-400 py-10 px-6 md:px-10 border-t border-surface-800/80">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="bg-brand-600 text-white px-2 py-0.5 rounded font-bold">ESFOT</div>
            <span className="font-semibold text-surface-300">Escuela Politécnica Nacional</span>
          </div>
          <div className="text-surface-500 text-center md:text-left">
            &copy; 2026 Proyecto de Titulación TSDS • Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
