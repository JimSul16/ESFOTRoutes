import { team } from '../landing.data';

/**
 * Equipo (Spec S5): encabezado a la izquierda y tarjetas desplazadas
 * (la segunda cae 2rem más abajo) en lugar de un grid centrado plano.
 */
const TeamSection = () => (
  <section
    id="equipo"
    className="py-24 px-6 md:px-10 bg-surface-50 dark:bg-surface-950 border-t border-surface-200 dark:border-surface-800"
  >
    <div className="max-w-7xl mx-auto">
      <div className="max-w-xl">
        <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-surface-900 dark:text-white text-balance">
          {team.title}
        </h2>
        <p className="mt-4 text-base text-surface-600 dark:text-surface-300 leading-relaxed">
          {team.description}
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 max-w-3xl md:ml-[6%]">
        {team.members.map((member, index) => (
          <article
            key={member.initials}
            className={[
              'bg-white dark:bg-surface-900 p-6 rounded-panel border border-surface-200 dark:border-surface-800 shadow-card',
              'hover:shadow-soft hover:border-brand-500/40 transition-all',
              // Segunda tarjeta desplazada: rompe la simetría del par.
              index === 1 ? 'sm:translate-y-8' : '',
            ].join(' ')}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 shrink-0 rounded-card bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-display font-bold text-lg border border-brand-200/60 dark:border-brand-800/40 shadow-card">
                {member.initials}
              </div>
              <div>
                <h3 className="font-display font-bold text-surface-900 dark:text-white text-lg">
                  {member.name}
                </h3>
                <p className="text-2xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-[0.16em] mt-1">
                  {member.role}
                </p>
              </div>
            </div>
            <p className="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800 text-xs text-surface-500 dark:text-surface-400">
              {member.detail}
            </p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default TeamSection;
