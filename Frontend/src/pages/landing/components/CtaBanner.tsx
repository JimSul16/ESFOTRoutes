import { Link } from 'react-router-dom';
import { cta } from '../landing.data';

/**
 * CTA final (Spec S5): split asimétrico (copy a la izquierda, acción a
 * la derecha) con blobs orgánicos de desenfoque sobre el gradiente
 * institucional, en vez de un rectángulo centrado y plano.
 */
const CtaBanner = () => (
  <section className="relative overflow-hidden bg-gradient-to-tr from-brand-950 via-surface-900 to-surface-950 text-white px-6 md:px-10 py-20 md:py-24">
    <div
      aria-hidden="true"
      className="absolute -top-28 -right-20 w-96 h-96 rounded-full bg-brand-600/25 blur-3xl pointer-events-none"
    />
    <div
      aria-hidden="true"
      className="absolute -bottom-36 left-1/4 w-80 h-80 rounded-full bg-primary-600/10 blur-3xl pointer-events-none"
    />

    <div className="max-w-7xl mx-auto relative z-10 grid md:grid-cols-12 gap-8 items-center">
      <div className="md:col-span-7">
        <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-balance">
          {cta.title}
        </h2>
        <p className="mt-4 text-surface-300 leading-relaxed md:text-lg max-w-xl">
          {cta.description}
        </p>
      </div>
      <div className="md:col-span-5 md:justify-self-end">
        <Link
          to="/register"
          className="inline-flex w-full sm:w-auto justify-center bg-white hover:bg-surface-100 text-surface-950 font-bold px-8 py-3.5 rounded-xl shadow-float transition-all hover:scale-[1.03] active:scale-[0.98]"
        >
          {cta.button}
        </Link>
      </div>
    </div>
  </section>
);

export default CtaBanner;
