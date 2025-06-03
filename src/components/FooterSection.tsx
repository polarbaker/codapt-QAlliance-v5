import { Mail, ArrowRight, Twitter, Linkedin, Youtube, Instagram } from "lucide-react";
import toast from "react-hot-toast";

export default function FooterSection() {
  return (
    <footer className="bg-background-black py-20">
      <div className="mx-auto max-w-7xl container-padding">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-2 lg:grid-cols-3">
          {/* Logo and Description */}
          <div>
            <div className="mb-6 text-3xl font-bold text-text-light">
              Quantum Alliance
            </div>
            <p className="mb-8 text-text-light/70">
              Bridging innovation gaps by connecting frontier technology with real-world problems across the globe.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Our Twitter profile is launching soon! Follow us for real-time updates on challenges and innovators.");
                }}
                className="rounded-full border border-text-light/30 p-2 text-text-light/70 transition-colors hover:border-secondary hover:text-secondary"
                aria-label="Twitter"
              >
                <Twitter size={18} />
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Our LinkedIn profile is launching soon! Connect with us for professional updates and networking opportunities.");
                }}
                className="rounded-full border border-text-light/30 p-2 text-text-light/70 transition-colors hover:border-secondary hover:text-secondary"
                aria-label="LinkedIn"
              >
                <Linkedin size={18} />
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Our YouTube channel is launching soon! Subscribe for videos featuring our innovators and their solutions.");
                }}
                className="rounded-full border border-text-light/30 p-2 text-text-light/70 transition-colors hover:border-secondary hover:text-secondary"
                aria-label="YouTube"
              >
                <Youtube size={18} />
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Our Instagram profile is launching soon! Follow us for visual stories of impact and innovation.");
                }}
                className="rounded-full border border-text-light/30 p-2 text-text-light/70 transition-colors hover:border-secondary hover:text-secondary"
                aria-label="Instagram"
              >
                <Instagram size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links - Using semantic HTML */}
          <div>
            <h3 className="mb-6 text-xl font-bold text-text-light">Quick Links</h3>
            <nav aria-label="Quick navigation links">
              <ul className="grid grid-cols-2 gap-x-8 gap-y-3">
                <li>
                  <a 
                    href="/about" 
                    className="text-text-light/70 transition-colors hover:text-secondary hover:underline"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a 
                    href="/case-studies" 
                    className="text-text-light/70 transition-colors hover:text-secondary hover:underline"
                  >
                    Case Studies
                  </a>
                </li>
                <li>
                  <a 
                    href="#impact" 
                    className="text-text-light/70 transition-colors hover:text-secondary hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('impact')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Impact
                  </a>
                </li>
                <li>
                  <a 
                    href="/news" 
                    className="text-text-light/70 transition-colors hover:text-secondary hover:underline"
                  >
                    News & Events
                  </a>
                </li>
                <li>
                  <a 
                    href="#join-us" 
                    className="text-text-light/70 transition-colors hover:text-secondary hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('join-us')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Join Us
                  </a>
                </li>
                <li>
                  <a 
                    href="/investors" 
                    className="text-text-light/70 transition-colors hover:text-secondary hover:underline"
                  >
                    Become an Investor
                  </a>
                </li>
                <li>
                  <a 
                    href="/challenges" 
                    className="text-text-light/70 transition-colors hover:text-secondary hover:underline"
                  >
                    Current Challenges
                  </a>
                </li>
                <li>
                  <a 
                    href="/innovators" 
                    className="text-text-light/70 transition-colors hover:text-secondary hover:underline"
                  >
                    Innovators
                  </a>
                </li>
                <li>
                  <a 
                    href="/impact#data" 
                    className="text-text-light/70 transition-colors hover:text-secondary hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('data')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Data & Insights
                  </a>
                </li>
                <li>
                  <a 
                    href="/submit-a-challenge" 
                    className="text-text-light/70 transition-colors hover:text-secondary hover:underline"
                  >
                    Submit a Challenge
                  </a>
                </li>
                <li>
                  <a 
                    href="/apply" 
                    className="text-text-light/70 transition-colors hover:text-secondary hover:underline"
                  >
                    Apply as an Innovator
                  </a>
                </li>
                <li>
                  <a 
                    href="/partners" 
                    className="text-text-light/70 transition-colors hover:text-secondary hover:underline"
                  >
                    Partner with Us
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="mb-6 text-xl font-bold text-text-light">Stay Updated</h3>
            <p className="mb-6 text-text-light/70">
              Subscribe to our newsletter for the latest challenges, success stories, and events.
            </p>
            <div className="flex">
              <input
                type="email"
                id="newsletter-email"
                placeholder="Your email address"
                className="w-full rounded-l-full border-0 bg-background-light/10 px-5 py-3 text-text-light placeholder:text-text-light/50 focus:ring-2 focus:ring-secondary"
                aria-label="Your email address"
              />
              <button 
                onClick={() => {
                  const email = (document.getElementById('newsletter-email') as HTMLInputElement)?.value;
                  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    toast.success("Thanks for subscribing! We'll send you our next newsletter soon.");
                  } else {
                    toast.error("Please enter a valid email address");
                  }
                }}
                className="rounded-r-full bg-secondary px-5 py-3 text-white transition-colors hover:bg-secondary-light"
                aria-label="Subscribe to newsletter"
              >
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-16 border-t border-text-light/10 pt-8">
          <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
            <p className="text-sm text-text-light/50">
              © {new Date().getFullYear()} Quantum Alliance. All rights reserved.
            </p>
            <div className="flex space-x-8">
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Our Privacy Policy is being finalized and will be available soon. We're committed to protecting your data.");
                }}
                className="text-sm text-text-light/50 transition-colors hover:text-secondary"
                aria-label="Read our Privacy Policy"
              >
                Privacy Policy
              </a>
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Our Terms of Service are being finalized and will be available soon. We're establishing clear guidelines for all participants.");
                }}
                className="text-sm text-text-light/50 transition-colors hover:text-secondary"
                aria-label="Read our Terms of Service"
              >
                Terms of Service
              </a>
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Our Cookie Policy is being finalized and will be available soon. We're ensuring transparency in our data practices.");
                }}
                className="text-sm text-text-light/50 transition-colors hover:text-secondary"
                aria-label="Read our Cookie Policy"
              >
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
