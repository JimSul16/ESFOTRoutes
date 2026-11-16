import { features } from '../landing.data';
import FeatureCard from './FeatureCard';

/**
 * Características (Spec S5): encabezado en rail izquierdo pegajoso y
 * tarjetas de altura desigual (una destacada + dos compactas), en lugar
 * de `text-center` + `grid-cols-3` idénticas.
 */
const FeatureSection = () => (
  <section
    id="caracteristicas"
    className="py-24 md:py-32 px-6 md:px-10 bg-surface-50 dark:bg-surface-950"
  >
    <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-10 lg:gap-16 items-start">
      <header className="md:col-span-4 lg:col-span-3 md:sticky md:top-24">
        <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-surface-900 dark:text-white text-balance">
          {features.title}
        </h2>
        <p className="mt-4 text-base text-surface-600 dark:text-surface-300 leading-relaxed">
          {features.description}
        </p>
        <span aria-hidden="true" className="mt-7 block h-1 w-16 rounded-full bg-brand-500" />
      </header>

      <div className="md:col-span-8 lg:col-span-9">
        {/* Tarjeta destacada: ocupa todo el ancho del rail derecho. */}
        <FeatureCard item={features.items[0]} featured />

        {/* Compactas debajo: mitad de ancho, altura menor (ritmo desigual). */}
        <div className="mt-6 grid sm:grid-cols-2 gap-6">
          <FeatureCard item={features.items[1]} />
          <FeatureCard item={features.items[2]} />
        </div>
      </div>
    </div>
  </section>
);

export default FeatureSection;
