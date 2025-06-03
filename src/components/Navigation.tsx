import { useState, useEffect, useCallback } from "react";
import { Menu, X } from "lucide-react";
import { useMatch } from "@tanstack/react-router";
import { debounce } from "~/utils";

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Use TanStack Router's useMatch to determine if we're on a specific route
  const homeMatch = useMatch({ to: "/" });
  const aboutMatch = useMatch({ to: "/about" });
  const challengesMatch = useMatch({ to: "/challenges" });
  const submitMatch = useMatch({ to: "/submit-a-challenge" });
  const caseStudiesMatch = useMatch({ to: "/case-studies" });
  const innovatorsMatch = useMatch({ to: "/innovators" });
  const newsMatch = useMatch({ to: "/news" });
  const investorsMatch = useMatch({ to: "/investors" });
  const applyMatch = useMatch({ to: "/apply" });
  const partnersMatch = useMatch({ to: "/partners" });

  // Debounced scroll handler
  const handleScroll = useCallback(
    debounce(() => {
      // Update scrolled state
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    }, 100),
    []
  );

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  // Handle focus management for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  // Updated navigation links to match requirements
  const navLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Challenges", href: "/challenges" },
    { name: "Case Studies", href: "/case-studies" },
    { name: "Innovators", href: "/innovators" },
    { name: "News & Events", href: "/news" },
    { name: "Impact", href: "/#impact" },
  ];

  const handleNavLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Close the menu when a link is clicked
    setIsMenuOpen(false);
    
    // Handle scroll behavior for hash links when on the homepage
    if (href.includes('#') && window.location.pathname === '/') {
      e.preventDefault();
      const targetId = href.split('#')[1];
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Check if a link is active based on the current route or hash
  const isActive = (href: string) => {
    // For hash links on homepage
    if (href.includes('#')) {
      const isHomePage = window.location.pathname === '/';
      const currentHash = window.location.hash;
      
      if (isHomePage && currentHash === href.substring(href.indexOf('#'))) {
        return true;
      }
      
      // Special case for home page with empty hash
      if (isHomePage && href === '/#about' && !currentHash) {
        return false;
      }
    }
    
    // For regular routes
    if (href === "/") return homeMatch?.success && !window.location.hash;
    if (href === "/about") return aboutMatch?.success;
    if (href === "/challenges") return challengesMatch?.success;
    if (href === "/submit-a-challenge") return submitMatch?.success;
    if (href === "/case-studies") return caseStudiesMatch?.success;
    if (href === "/innovators") return innovatorsMatch?.success;
    if (href === "/news") return newsMatch?.success;
    if (href === "/investors") return investorsMatch?.success;
    if (href === "/apply") return applyMatch?.success;
    if (href === "/partners") return partnersMatch?.success;
    
    return false;
  };

  return (
    <>
      {/* Fixed header */}
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-500 ${
          isScrolled
            ? "bg-background-black/90 backdrop-blur-md py-3 shadow-lg"
            : "bg-transparent py-6"
        }`}
      >
        <div className="container-padding mx-auto flex max-w-7xl items-center justify-between">
          <a 
            href="/" 
            className="z-10 text-2xl font-bold text-text-light transition-all duration-300 hover:text-secondary"
            onClick={(e) => handleNavLinkClick(e, "/")}
          >
            Quantum Alliance
          </a>

          {/* Desktop Navigation - hidden on mobile */}
          <nav className="hidden md:block" aria-label="Main navigation">
            <ul className="flex space-x-6">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className={`relative px-2 py-1 text-sm font-medium transition-all duration-300 hover:text-secondary ${
                      isActive(link.href) 
                        ? "text-secondary font-bold" 
                        : "text-text-light/90"
                    }`}
                    onClick={(e) => handleNavLinkClick(e, link.href)}
                    aria-current={isActive(link.href) ? "page" : undefined}
                  >
                    {link.name}
                    {isActive(link.href) && (
                      <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-secondary rounded-full"></span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`z-10 flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${
              isMenuOpen 
                ? "bg-neutral-dark text-text-light rotate-90"
                : "bg-secondary text-text-light hover:bg-secondary-light"
            }`}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            aria-controls="fullscreen-nav"
          >
            {isMenuOpen ? (
              <X size={24} className="text-white" />
            ) : (
              <Menu size={24} className="text-white" />
            )}
          </button>
        </div>
      </header>

      {/* Full-screen menu overlay */}
      <div
        className={`fixed inset-0 z-40 flex items-center justify-center bg-black/95 backdrop-blur-lg transition-all duration-500 overflow-y-auto ${
          isMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ maxHeight: '100vh' }}
      >
        <nav id="fullscreen-nav" className="container-padding mx-auto max-w-4xl w-full">
          <ul className="flex flex-col items-center justify-center space-y-6 py-8">
            {navLinks.map((link) => (
              <li key={link.name} className="w-full text-center py-2">
                <a
                  href={link.href}
                  className={`block text-3xl font-medium transition-all duration-300 hover:text-secondary hover:scale-105 md:text-5xl ${
                    isActive(link.href) 
                      ? "text-secondary font-bold" 
                      : "text-text-light/90"
                  }`}
                  onClick={(e) => handleNavLinkClick(e, link.href)}
                  aria-current={isActive(link.href) ? "page" : undefined}
                >
                  {link.name}
                  {isActive(link.href) && (
                    <span className="block mx-auto mt-2 h-1 w-24 bg-secondary rounded-full"></span>
                  )}
                </a>
              </li>
            ))}
            <li className="pt-10 w-full text-center">
              <a
                href="/submit-a-challenge"
                className="inline-block rounded-full bg-secondary px-8 py-4 text-xl font-medium text-white transition-all hover:bg-secondary-light hover:shadow-lg hover:scale-105"
                onClick={(e) => handleNavLinkClick(e, "/submit-a-challenge")}
              >
                Get Involved
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}
