import { footer } from '../landing.data';

/** Pie de página institucional, extraído verbatim de la landing original. */
const LandingFooter = () => (
  <footer className="bg-surface-950 text-surface-400 py-10 px-6 md:px-10 border-t border-surface-800/80">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
      <div className="flex items-center gap-2">
        <div className="bg-brand-600 text-white px-2 py-0.5 rounded font-bold">{footer.brand}</div>
        <span className="font-semibold text-surface-300">{footer.institution}</span>
      </div>
      <div className="text-surface-500 text-center md:text-left">{footer.copyright}</div>
    </div>
  </footer>
);

export default LandingFooter;
