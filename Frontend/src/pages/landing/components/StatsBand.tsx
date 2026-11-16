import { stats } from '../landing.data';

/**
 * Registro tipográfico de impacto (Spec S5): cifras de dos escalas
 * distintas separadas por hairlines, sin rejilla de 4 celdas idénticas
 * ni alineación centrada.
 */
const StatsBand = () => (
  <section className="bg-white dark:bg-surface-900 border-y border-surface-200 dark:border-surface-800 py-14 px-6 md:px-10">
    <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-12 gap-x-6 gap-y-10 md:gap-y-0 items-end">
      {stats.map((stat, index) => {
        const esCifraGrande = index < 2;
        return (
          <div
            key={stat.label}
            className={[
              'md:col-span-3',
              index > 0
                ? 'md:border-l md:border-surface-200 dark:md:border-surface-800 md:pl-6'
                : '',
              // Ritmo descendente: la segunda pareja arranca más abajo.
              index % 2 === 1 ? 'md:pb-2' : '',
            ].join(' ')}
          >
            <div
              className={[
                'font-display font-extrabold tracking-tight leading-none',
                esCifraGrande
                  ? 'text-4xl md:text-6xl'
                  : 'text-3xl md:text-4xl md:mb-1',
                stat.emphasis
                  ? 'text-surface-900 dark:text-surface-100'
                  : 'text-brand-600 dark:text-brand-400',
              ].join(' ')}
            >
              {stat.value}
            </div>
            <div className="mt-2 text-2xs font-semibold uppercase tracking-[0.16em] text-surface-500 dark:text-surface-400">
              {stat.label}
            </div>
          </div>
        );
      })}
    </div>
  </section>
);

export default StatsBand;
