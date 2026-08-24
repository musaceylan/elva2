import { Nav } from "@/components/nav";
import { IncidentFilm } from "@/components/incident";
import { Record } from "@/components/record";
import { Proof } from "@/components/proof";
import { Systems } from "@/components/systems";
import { Schematic } from "@/components/schematic";
import { Industries } from "@/components/industries";
import {
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
        {/* The incident: one continuous scene, scrubbed by scroll. Everything
            below it is the company behind the system you just watched work. */}
        <IncidentFilm />
        <Record />
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
