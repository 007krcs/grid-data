import { Hero } from '../sections/Hero';
import { Stats } from '../sections/Stats';
import { Products } from '../sections/Products';
import { SocialProof } from '../sections/SocialProof';
import { AiSection } from '../sections/AiSection';
import { QuickStart } from '../sections/QuickStart';
import { DemoCards } from '../sections/DemoCards';
import { Benchmarks } from '../sections/Benchmarks';
import { Comparison } from '../sections/Comparison';
import { Features } from '../sections/Features';
import { Ecosystem } from '../sections/Ecosystem';
import { TechStack } from '../sections/TechStack';

export function HomePage() {
  return (
    <>
      <Hero />
      <Stats />
      <SocialProof />
      <Products />
      <QuickStart />
      <AiSection />
      <DemoCards />
      <Benchmarks />
      <Comparison />
      <Features />
      <Ecosystem />
      <TechStack />
    </>
  );
}
