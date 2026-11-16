import { process } from '../landing.data';

const stagger = ['', 'md:mt-16', 'md:mt-32'];

/**
 * "Cómo funciona" (Spec S5): línea de tiempo escalonada con números
 * gigantes en outline (trazo `brand`), no tres tarjetas idénticas.
 */
const ProcessTimeline = () => (
  <section
    id="como-funciona"
    className="py-24 md:py-28 px-6 md:px-10 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800"
  >
    <div className="max-w-7xl mx-auto">
      {/* Encabezado alineado a la izquierda, ancho de lectura corto. */}
      <div className="max-w-2xl">
        <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-surface-900 dark:text-white text-balance">
          {process.title}
        </h2>
        <p className="mt-4 text-base text-surface-600 dark:text-surface-300 leading-relaxed">
          {process.description}
        </p>
      </div>

      <ol className="mt-16 grid gap-14 md:grid-cols-3 md:gap-10 items-start">
        {process.steps.map((step, index) => (
          <li key={step.step} className={`relative ${stagger[index] ?? ''}`}>
            <span
              aria-hidden="true"
              className="block font-display font-extrabold leading-none text-7xl md:text-8xl text-transparent select-none [-webkit-text-stroke:2px_var(--color-brand-300)] dark:[-webkit-text-stroke:2px_var(--color-brand-800)]"
            >
              {step.step}
            </span>
            <span
              aria-hidden="true"
              className="mt-6 block h-px w-12 bg-brand-500 dark:bg-brand-400"
            />
            <h3 className="mt-5 font-display text-lg font-bold text-surface-900 dark:text-white">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-surface-600 dark:text-surface-400">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default ProcessTimeline;
