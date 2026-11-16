import { Link } from 'react-router-dom';
import { hero } from '../landing.data';
import RoutePreviewMock from './RoutePreviewMock';

/**
 * Hero asimétrico (Spec S4): copy en las columnas 1-6 alineado a la
 * izquierda y mockup en 7-12 con sangrado hacia el borde derecho.
 * Sin `text-center` en ningún ancestro del titular.
 */
const HeroSection = () => (
  <section className="relative overflow-hidden pt-14 pb-20 md:pt-20 md:pb-28 px-6 md:px-10">
    {/* Brillo ambiental: solo tokens brand/accent sobre surface. */}
    <div
      aria-hidden="true"
      className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-brand-500/12 via-brand-500/6 to-transparent blur-3xl pointer-events-none -z-10"
    />

    <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-10 lg:gap-16 items-start">
      {/* --- Copy (columnas 1-6) --- */}
      <div className="md:col-span-6 lg:col-span-5">
        {/* Eyebrow editorial: punto de marca + hairline en lugar de pill centrada. */}
        <div className="flex items-center gap-3 mb-7">
          <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500 ring-4 ring-brand-500/15" />
          <span className="text-2xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-400">
            {hero.eyebrow}
          </span>
          <span
            aria-hidden="true"
            className="hidden sm:block h-px flex-1 bg-gradient-to-r from-brand-300/80 to-transparent dark:from-brand-800"
          />
        </div>

        {/* Contraste tipográfico: Sora 700 en la línea base, Sora 800 + subrayado
            de marca en la frase clave, con salto de escala explícito. */}
        <h1 className="font-display font-bold tracking-tight text-4xl sm:text-5xl lg:text-[3.6rem] leading-[1.06] text-surface-900 dark:text-white text-balance">
          {hero.titleLead}{' '}
          <span className="relative inline-block font-extrabold text-[1.07em] text-brand-600 dark:text-brand-400">
            {hero.titleAccent}
            <svg
              aria-hidden="true"
              className="absolute left-0 -bottom-[0.12em] w-full h-[0.28em] text-brand-500 dark:text-brand-400"
              viewBox="0 0 300 12"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M4 8.5C64 3.8 158 2.6 296 6.4"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-surface-600 dark:text-surface-300">
          {hero.description}
        </p>

        {/* CTA asimétrico: botón sólido + enlace subrayado, no dos botones gemelos. */}
        <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-5">
          <Link
            to="/register"
            className="w-full sm:w-auto bg-brand-600 hover:bg-brand-500 text-white font-semibold text-base px-8 py-3.5 rounded-xl shadow-lg shadow-brand-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
          >
            <span>{hero.primaryCta}</span>
            <svg
              className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
          <a
            href="#como-funciona"
            className="w-full sm:w-auto text-center sm:text-left font-semibold text-surface-700 dark:text-surface-200 hover:text-brand-600 dark:hover:text-brand-400 pb-1 border-b-2 border-surface-300 dark:border-surface-600 hover:border-brand-500 transition-colors"
          >
            {hero.secondaryCta}
          </a>
        </div>
      </div>

      {/* --- Mockup (columnas 7-12), con sangrado y línea base desplazada --- */}
      <div className="md:col-span-6 lg:col-span-7 md:-mr-4 lg:-mr-10 xl:-mr-16 md:mt-2 lg:mt-8">
        <RoutePreviewMock />
      </div>
    </div>
  </section>
);

export default HeroSection;
