import LandingNav from './landing/components/LandingNav';
import HeroSection from './landing/components/HeroSection';
import StatsBand from './landing/components/StatsBand';
import FeatureSection from './landing/components/FeatureSection';
import ProcessTimeline from './landing/components/ProcessTimeline';
import TeamSection from './landing/components/TeamSection';
import CtaBanner from './landing/components/CtaBanner';
import LandingFooter from './landing/components/LandingFooter';

/**
 * Landing page: solo composición (Spec S1).
 * El copy vive en `landing/landing.data.ts`, los tipos en
 * `landing/landing.types.ts` y cada sección en `landing/components/`.
 */
const Landing = () => (
  <div className="min-h-screen bg-surface-50 dark:bg-surface-950 font-sans text-surface-900 dark:text-surface-50 transition-colors duration-300 antialiased selection:bg-brand-500/20 selection:text-brand-600">
    <LandingNav />

    <main>
      <HeroSection />
      <StatsBand />
      <FeatureSection />
      <ProcessTimeline />
      <TeamSection />
      <CtaBanner />
    </main>

    <LandingFooter />
  </div>
);

export default Landing;
