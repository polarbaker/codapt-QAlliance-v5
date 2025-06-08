import { LightbulbIcon, Users } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useBulkSiteContentText } from "~/hooks/useSiteContentText";

export default function ChallengeCTASection() {
  const trpc = useTRPC();
  
  // Fetch challenge CTA section text content
  const { texts: challengeTexts } = useBulkSiteContentText([
    'challenge_cta_heading',
    'challenge_cta_subheading',
    'challenge_cta_card1_title',
    'challenge_cta_card1_description',
    'challenge_cta_card1_button',
    'challenge_cta_card2_title',
    'challenge_cta_card2_description',
    'challenge_cta_card2_button',
  ]);
  
  // Fetch challenge CTA background image from database
  const challengeCtaImageQuery = useQuery(
    trpc.getSiteContentImage.queryOptions({
      imageType: 'challenge_cta_background',
    })
  );

  // Use database image if available, otherwise fall back to hardcoded URL
  const getBackgroundImageUrl = () => {
    if (challengeCtaImageQuery.data?.hasImage && challengeCtaImageQuery.data?.imageData) {
      return challengeCtaImageQuery.data.imageData;
    }
    return 'https://images.unsplash.com/photo-1516110833967-0b5716ca1387?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80';
  };

  const backgroundImageUrl = getBackgroundImageUrl();

  return (
    <section className="relative overflow-hidden bg-background-black py-20">
      <div className="absolute inset-0 opacity-20">
        <div className="h-full w-full bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url('${backgroundImageUrl}')` }}></div>
      </div>
      
      <div className="relative z-10 mx-auto max-w-7xl container-padding">
        <div className="text-center mb-12">
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-text-light md:text-5xl">
            {challengeTexts.challenge_cta_heading}
          </h2>
          <p className="mx-auto max-w-3xl text-xl font-light text-text-light/80">
            {challengeTexts.challenge_cta_subheading}
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Submit Your Solution */}
          <div className="rounded-xl bg-neutral-dark/30 p-8 text-center transition-transform hover:scale-105">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20">
              <LightbulbIcon size={32} className="text-secondary" />
            </div>
            <h3 className="mb-4 text-2xl font-bold text-text-light">{challengeTexts.challenge_cta_card1_title}</h3>
            <p className="mb-6 text-text-light/70">
              {challengeTexts.challenge_cta_card1_description}
            </p>
            <a
              href="/apply"
              className="inline-block rounded-full bg-secondary px-8 py-3 text-white transition-all hover:bg-secondary-light"
            >
              {challengeTexts.challenge_cta_card1_button}
            </a>
          </div>
          
          {/* Become a Challenge Partner */}
          <div className="rounded-xl bg-neutral-dark/30 p-8 text-center transition-transform hover:scale-105">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20">
              <Users size={32} className="text-secondary" />
            </div>
            <h3 className="mb-4 text-2xl font-bold text-text-light">{challengeTexts.challenge_cta_card2_title}</h3>
            <p className="mb-6 text-text-light/70">
              {challengeTexts.challenge_cta_card2_description}
            </p>
            <a
              href="/partners"
              className="inline-block rounded-full border-2 border-text-light bg-transparent px-8 py-3 text-text-light transition-all hover:bg-text-light hover:text-background-black"
            >
              {challengeTexts.challenge_cta_card2_button}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
