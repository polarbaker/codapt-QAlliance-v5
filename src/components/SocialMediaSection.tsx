import { Twitter, Linkedin, Instagram, ArrowRight } from "lucide-react";

interface SocialPostProps {
  platform: "twitter" | "linkedin" | "instagram";
  author: string;
  content: string;
  date: string;
}

function SocialPost({ platform, author, content, date }: SocialPostProps) {
  const platformIcons = {
    twitter: <Twitter size={20} className="text-[#1DA1F2]" />,
    linkedin: <Linkedin size={20} className="text-[#0A66C2]" />,
    instagram: <Instagram size={20} className="text-[#E4405F]" />,
  };
  
  // Highlight hashtags
  const renderContent = () => {
    if (!content.includes("#")) {
      return <span>{content}</span>;
    }

    const parts = content.split(/(#\w+)/g);
    return parts.map((part, index) => 
      part.startsWith("#") ? (
        <span key={index} className="font-medium text-secondary">
          {part}
        </span>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  return (
    <div className="rounded-lg bg-background-light dark:bg-neutral-dark/20 p-6 shadow-sm">
      <div className="mb-4 flex items-center">
        <div className="mr-3 rounded-full bg-neutral-light dark:bg-neutral-dark p-2">
          {platformIcons[platform]}
        </div>
        <div>
          <h4 className="text-base font-bold text-text-dark dark:text-text-light">{author}</h4>
          <p className="text-xs text-text-dark/60 dark:text-text-light/60">{date}</p>
        </div>
      </div>
      <p className="mb-4 text-base text-text-dark dark:text-text-light">
        {renderContent()}
      </p>
    </div>
  );
}

interface TestimonialProps {
  quote: string;
  author: string;
  role: string;
}

function Testimonial({ quote, author, role }: TestimonialProps) {
  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        <p className="mb-6 text-xl font-light italic leading-relaxed text-text-dark dark:text-text-light md:text-2xl">
          "{quote}"
        </p>
      </div>
      <div>
        <p className="text-lg font-bold text-text-dark dark:text-text-light">{author}</p>
        <p className="text-base text-text-dark/70 dark:text-text-light/70">{role}</p>
      </div>
    </div>
  );
}

export default function SocialMediaSection() {
  const socialPosts = [
    {
      platform: "twitter" as const,
      author: "@InnovatorSarah",
      content:
        "Excited to announce our climate tech solution has been selected for @QuantumAlliance's next challenge round! #QuantumImpact",
      date: "2 hours ago",
    },
    {
      platform: "linkedin" as const,
      author: "Miguel Sanchez",
      content:
        "Proud to share that our team has secured $2M in funding after participating in Quantum Alliance's Digital Infrastructure Challenge. #QuantumImpact",
      date: "1 day ago",
    },
    {
      platform: "twitter" as const,
      author: "@TechForGood",
      content:
        "The work @QuantumAlliance is doing to connect innovators with real-world problems is transformative. #QuantumImpact",
      date: "1 week ago",
    },
    {
      platform: "instagram" as const,
      author: "quantum.alliance",
      content:
        "Our latest cohort of innovators just completed their first milestone presentations. The future is bright! #QuantumImpact #Innovation",
      date: "3 days ago",
    },
  ];

  const testimonials = [
    {
      quote:
        "Quantum Alliance is creating a new paradigm for how we solve complex global challenges through structured innovation.",
      author: "Dr. Elena Rodriguez",
      role: "MIT Innovation Lab Director",
    },
    {
      quote:
        "Their approach to connecting government needs with startup solutions is a model for 21st century public-private partnership.",
      author: "James Wilson",
      role: "Former UN Innovation Advisor",
    },
  ];

  return (
    <section
      id="social"
      className="section-padding relative overflow-hidden bg-background-light dark:bg-background-black"
    >
      <div className="mx-auto max-w-7xl container-padding">
        <div className="mb-16 max-w-3xl">
          <h2 className="mb-8 text-5xl font-extrabold leading-tight text-text-dark dark:text-text-light md:text-6xl">
            Join the Conversation
          </h2>
          <p className="text-xl font-light text-text-dark/80 dark:text-text-light/80 md:text-2xl">
            Connect with our global community of innovators, partners, and supporters.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-24 lg:grid-cols-2">
          {/* Left column: Featured testimonials */}
          <div>
            <div className="mb-6 text-sm font-semibold uppercase tracking-widest text-secondary">
              Testimonials
            </div>
            <div className="space-y-12">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="bg-neutral-light/10 dark:bg-neutral-dark/20 p-6 rounded-lg">
                  <Testimonial 
                    quote={testimonial.quote} 
                    author={testimonial.author} 
                    role={testimonial.role} 
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* Right column: Social posts */}
          <div>
            <div className="mb-6 text-sm font-semibold uppercase tracking-widest text-secondary">
              Social Feed
            </div>
            <div className="space-y-6">
              {socialPosts.slice(0, 3).map((post, index) => (
                <SocialPost
                  key={index}
                  platform={post.platform}
                  author={post.author}
                  content={post.content}
                  date={post.date}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Full-width CTA */}
        <div className="mt-24 rounded-lg bg-secondary p-12 text-white">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-4 text-3xl font-bold">Ready to make an impact?</h3>
              <p className="text-lg font-light">
                Join our community of innovators, supporters, and partners to help solve humanity's most pressing challenges.
              </p>
            </div>
            <div className="flex items-center justify-center md:justify-end">
              <a
                href="#join-us"
                className="inline-flex items-center rounded-full bg-white px-8 py-4 text-lg font-medium text-secondary transition-all hover:bg-neutral-light hover:scale-105"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('join-us')?.scrollIntoView({ behavior: 'smooth' });
                }}
                aria-label="Join the conversation and get involved"
              >
                Join the Conversation
                <ArrowRight size={20} className="ml-2" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
