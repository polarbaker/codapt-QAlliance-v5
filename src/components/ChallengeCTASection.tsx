import { LightbulbIcon, Users } from "lucide-react";

export default function ChallengeCTASection() {
  return (
    <section className="relative overflow-hidden bg-background-black py-20">
      <div className="absolute inset-0 opacity-20">
        <div className="h-full w-full bg-[url('https://images.unsplash.com/photo-1516110833967-0b5716ca1387?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center bg-no-repeat"></div>
      </div>
      
      <div className="relative z-10 mx-auto max-w-7xl container-padding">
        <div className="text-center mb-12">
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-text-light md:text-5xl">
            Want to Solve the Next Global Challenge?
          </h2>
          <p className="mx-auto max-w-3xl text-xl font-light text-text-light/80">
            Whether you're an innovator with a solution or an organization looking to partner on global challenges, join us in creating real-world impact.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Submit Your Solution */}
          <div className="rounded-xl bg-neutral-dark/30 p-8 text-center transition-transform hover:scale-105">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20">
              <LightbulbIcon size={32} className="text-secondary" />
            </div>
            <h3 className="mb-4 text-2xl font-bold text-text-light">Submit Your Solution</h3>
            <p className="mb-6 text-text-light/70">
              Have an innovative solution to one of our challenges? We want to hear from you and help scale your impact globally.
            </p>
            <a
              href="/submit-a-challenge"
              className="inline-block rounded-full bg-secondary px-8 py-3 text-white transition-all hover:bg-secondary-light"
            >
              Apply Now
            </a>
          </div>
          
          {/* Become a Challenge Partner */}
          <div className="rounded-xl bg-neutral-dark/30 p-8 text-center transition-transform hover:scale-105">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20">
              <Users size={32} className="text-secondary" />
            </div>
            <h3 className="mb-4 text-2xl font-bold text-text-light">Become a Challenge Partner</h3>
            <p className="mb-6 text-text-light/70">
              Organizations can partner with us to sponsor challenges, provide expertise, or help scale solutions in your industry or region.
            </p>
            <a
              href="#partner"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('partner')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-block rounded-full border-2 border-text-light bg-transparent px-8 py-3 text-text-light transition-all hover:bg-text-light hover:text-background-black"
            >
              Partner With Us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
