import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  const [theme, setTheme] = useState(
    localStorage.getItem('theme') || 'light'
  );

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-2 rounded-lg font-bold text-xl tracking-tighter">
              ESFOT
            </div>
            <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Rutas</span>
          </div>
          
          <div className="hidden lg:flex items-center space-x-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#soluciones" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Tutoría IA</a>
            <a href="#malla" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Filtros TSDS</a>
            <a href="#faq" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">FAQ Académico</a>
            <a href="#equipo" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">El Equipo</a>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              )}
            </button>
            <Link to="/login" className="hidden sm:block text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 font-semibold transition-colors">
              Ingreso EPN
            </Link>
            <Link to="/register" className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-2.5 rounded-lg hover:from-violet-700 hover:to-indigo-700 font-semibold shadow-md transition-all active:scale-95">
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative pt-24 pb-20 px-6 md:px-12 overflow-hidden flex justify-center text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-100 via-white to-white dark:from-violet-900/20 dark:via-slate-900 dark:to-slate-900 -z-10"></div>
          <div className="max-w-5xl mx-auto relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 text-sm font-semibold mb-8 border border-violet-200 dark:border-violet-500/20">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Potenciado por Gemini Flash
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8 text-slate-900 dark:text-white">
              No estudies a ciegas. <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-500">
                Aprende con Inteligencia
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed">
              La plataforma definitiva para los estudiantes de Desarrollo de Software de la ESFOT. Supera las materias de especialidad usando rutas de aprendizaje personalizadas y una IA entrenada para evaluar tu código y razonamiento lógico.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/register" className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-violet-500/30 transition-all flex items-center justify-center gap-2">
                Estructurar mi Semestre
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
              </Link>
            </div>
          </div>
        </section>

        <section id="soluciones" className="py-24 px-6 md:px-12 bg-white dark:bg-slate-900">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Por qué Rutas ESFOT es diferente?</h2>
              <p className="text-slate-600 dark:text-slate-400">Diseñado para resolver problemas reales del aprendizaje técnico.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-12 relative">
              <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-violet-200 to-violet-200 dark:from-slate-700 dark:to-slate-700 -z-10"></div>
              
              <div className="text-center bg-white dark:bg-slate-900">
                <div className="w-24 h-24 mx-auto bg-blue-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 rounded-full flex items-center justify-center mb-6 shadow-xl">
                  <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Rutas Centralizadas</h3>
                <p className="text-slate-600 dark:text-slate-400">Deja de perder tiempo buscando recursos. Sigue módulos secuenciales creados específicamente basados en los sílabos de programación y redes de la facultad.</p>
              </div>

              <div className="text-center bg-white dark:bg-slate-900">
                <div className="w-24 h-24 mx-auto bg-violet-600 text-white border-4 border-white dark:border-slate-900 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-violet-500/30">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Evaluación por IA</h3>
                <p className="text-slate-600 dark:text-slate-400">Nuestro sistema potenciado por Gemini no te da las respuestas. Analiza tu código, plantea escenarios prácticos y te obliga a usar la lógica para avanzar de módulo.</p>
              </div>

              <div className="text-center bg-white dark:bg-slate-900">
                <div className="w-24 h-24 mx-auto bg-emerald-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 rounded-full flex items-center justify-center mb-6 shadow-xl">
                  <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Generación Dinámica</h3>
                <p className="text-slate-600 dark:text-slate-400">Sube tus propios apuntes o documentos de investigación. La IA leerá tu material y generará evaluaciones técnicas instantáneas sobre ese conocimiento específico.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="malla" className="py-24 px-6 md:px-12 bg-slate-50 dark:bg-slate-800/30">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">Navegando los semestres de especialidad</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-t-4 border-blue-500">
                <div className="text-blue-500 font-black text-4xl mb-4">02</div>
                <h3 className="font-bold text-lg mb-2">Fundamentos de POO</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">El inicio de la especialidad. Sienta las bases de la Programación Orientada a Objetos y la lógica algorítmica.</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-t-4 border-red-500">
                <div className="text-red-500 font-black text-4xl mb-4">03</div>
                <h3 className="font-bold text-lg mb-2">Redes de Computadores</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">El filtro definitivo. Modelos de comunicación, subredes, configuración de equipos y un rigor académico brutal.</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-t-4 border-violet-500">
                <div className="text-violet-500 font-black text-4xl mb-4">04</div>
                <h3 className="font-bold text-lg mb-2">Desarrollo de Aplicaciones</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Construcción Web y Móvil. La exigencia de integrar interfaces con bases de datos operativas en tiempo real.</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-t-4 border-emerald-500">
                <div className="text-emerald-500 font-black text-4xl mb-4">05</div>
                <h3 className="font-bold text-lg mb-2">Titulación Práctica</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Desarrollo del proyecto integrador final demostrando dominio en infraestructura y software empresarial.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="py-24 px-6 md:px-12 bg-white dark:bg-slate-900">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-10 text-center">Dudas Frecuentes - Estudiantes ESFOT</h2>
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h4 className="text-lg font-bold mb-2">¿Cómo me ayuda la plataforma con Redes de Computadores?</h4>
                <p className="text-slate-600 dark:text-slate-400">Sabemos que es la materia más pesada. La plataforma te permite estructurar tus apuntes de topologías y modelado OSI de forma lógica, preparándote para la exigencia de la cátedra.</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h4 className="text-lg font-bold mb-2">¿Es útil para evitar bloqueos a fin de semestre?</h4>
                <p className="text-slate-600 dark:text-slate-400">Sí. El sistema te obliga a mapear la arquitectura y las rutas de tu API antes de programar, mitigando los típicos errores de CORS y dependencias rotas.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="equipo" className="py-24 px-6 md:px-12 bg-slate-50 dark:bg-slate-800/30">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2">
                <div className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-sm font-semibold mb-4">
                  Escuela de Formación de Tecnólogos - EPN
                </div>
                <h2 className="text-3xl md:text-5xl font-bold mb-6">El Equipo Detrás</h2>
                <p className="text-slate-600 dark:text-slate-400 text-lg mb-6 leading-relaxed">
                  Rutas nació en los laboratorios de la ESFOT. Como estudiantes, vimos la necesidad urgente de una herramienta que ayudara a organizar y validar el conocimiento técnico antes de enfrentar las defensas de proyectos en materias críticas.
                </p>
                <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 leading-relaxed">
                  Desarrollado de manera conjunta por Jimmy Lucero, Adonis López y Andrés Caiza, este sistema unifica los estándares de infraestructura y desarrollo en un entorno interactivo y sin distracciones.
                </p>
                <div className="flex gap-4">
                  <div className="flex -space-x-4">
                    <div className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-900 bg-violet-200 dark:bg-violet-800 flex items-center justify-center font-bold text-violet-700 dark:text-violet-200">J</div>
                    <div className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-900 bg-blue-200 dark:bg-blue-800 flex items-center justify-center font-bold text-blue-700 dark:text-blue-200">A</div>
                    <div className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-200">A</div>
                  </div>
                  <div className="flex flex-col justify-center pl-2">
                    <span className="font-bold text-slate-900 dark:text-white">Estudiantes TSDS</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Equipo de Arquitectura</span>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2 w-full">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm transform translate-y-8">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
                    </div>
                    <h4 className="font-bold mb-2">Visión Técnica</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Entendemos la frustración del error de lógica y diseñamos a Gemini para que te obligue a pensar, no a copiar.</p>
                  </div>
                  <div className="bg-violet-600 text-white rounded-3xl p-6 shadow-lg shadow-violet-500/20">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                    </div>
                    <h4 className="font-bold mb-2">Código Limpio</h4>
                    <p className="text-sm text-violet-100">Desarrollo basado en un backend sólido con Prisma y PostgreSQL, garantizando estabilidad en tus pruebas.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 md:px-12 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-8">Comienza a dominar el código hoy</h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-10">Accede con tu correo institucional y descubre cómo la IA puede transformar tu manera de prepararte para las materias de la Politécnica.</p>
            <Link to="/register" className="inline-block bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-10 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-2xl">
              Crear mi perfil ahora
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 grayscale brightness-200">
            <div className="bg-violet-600 text-white p-1.5 rounded-md font-bold text-lg">ESFOT</div>
            <span className="text-lg font-bold text-white">Rutas</span>
          </div>
          <div className="text-sm text-center md:text-left">
            &copy; 2026 Estudiantes TSDS - Escuela Politécnica Nacional. <br className="sm:hidden"/>Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;