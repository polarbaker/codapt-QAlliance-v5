import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useBulkSiteContentText } from "~/hooks/useSiteContentText";

export default function BoldStatementSection() {
  const trpc = useTRPC();
  
  // Fetch bold statement text content
  const { texts: boldTexts } = useBulkSiteContentText([
    'bold_statement_text',
    'bold_statement_button',
    'bold_statement_stat',
  ]);
  
  // Fetch bold statement background image from database
  const boldStatementImageQuery = useQuery(
    trpc.getSiteContentImage.queryOptions({
      imageType: 'bold_statement_background',
    })
  );

  // Use database image if available, otherwise fall back to hardcoded URL
  const getBackgroundImageUrl = () => {
    if (boldStatementImageQuery.data?.hasImage && boldStatementImageQuery.data?.imageData) {
      return boldStatementImageQuery.data.imageData;
    }
    return 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=987&q=80';
  };

  const backgroundImageUrl = getBackgroundImageUrl();

  return (
    <section
      id="statement"
      className="section-padding relative overflow-hidden bg-background-light dark:bg-background-black"
    >
      <div className="mx-auto max-w-7xl container-padding">
        <div className="grid grid-cols-1 items-center gap-16 md:grid-cols-2">
          {/* Main statement */}
          <div>
            <h2 className="mb-10 text-4xl font-extrabold leading-tight text-text-dark dark:text-text-light sm:text-5xl md:text-6xl lg:text-7xl">
              "{boldTexts.bold_statement_text}"
            </h2>
            
            <a
              href="#about"
              className="inline-flex items-center text-lg font-semibold text-secondary hover-line"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {boldTexts.bold_statement_button}
            </a>
          </div>
          
          {/* Image */}
          <div className="relative aspect-square overflow-hidden">
            <div className="absolute inset-0" style={{ backgroundImage: `url('${backgroundImageUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <div className="absolute inset-0 bg-secondary opacity-30 mix-blend-multiply"></div>
            
            {/* Overlay stat */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <span className="block text-7xl font-black text-text-light">1M+</span>
              <span className="text-xl font-light uppercase tracking-widest text-text-light">{boldTexts.bold_statement_stat}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
