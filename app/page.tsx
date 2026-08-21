import { Nav } from "@/components/nav";
import { Hero } from "@/components/hero";
import { Proof } from "@/components/proof";
import { Systems } from "@/components/systems";
import { Schematic } from "@/components/schematic";
import {
  Industries,
  Services,
  Confidentiality,
  FinalCta,
  Footer,
} from "@/components/sections";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <Proof />
        <Systems />
        <Schematic />
        <Industries />
        <Services />
        <Confidentiality />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
