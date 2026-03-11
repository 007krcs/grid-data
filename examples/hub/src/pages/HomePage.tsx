import { Hero } from '../sections/Hero';
import { Stats } from '../sections/Stats';
import { Products } from '../sections/Products';
import { AiSection } from '../sections/AiSection';
import { DemoCards } from '../sections/DemoCards';
import { Benchmarks } from '../sections/Benchmarks';
import { Features } from '../sections/Features';
import { Ecosystem } from '../sections/Ecosystem';
import { TechStack } from '../sections/TechStack';

export function HomePage() {
  return (
    <>
      <Hero />
      <Stats />
      <Products />
      <AiSection />
      <DemoCards />
      <Benchmarks />
      <Features />
      <Ecosystem />
      <TechStack />
    </>
  );
}
