import { useState, useEffect, useCallback } from "react";
import { Menu, X } from "lucide-react";
import { useMatch } from "@tanstack/react-router";
import { debounce } from "~/utils/common";

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
            ? "bg-background-black/95 backdrop-blur-md py-4 shadow-lg border-b border-neutral-dark/20"
            : "bg-background-black/80 backdrop-blur-sm py-6 border-b border-neutral-dark/10"
        }`}
      >
        <div className="container-padding mx-auto flex max-w-7xl items-center justify-between">
          <a 
            href="/" 
            className="z-10 text-2xl font-bold text-text-light transition-all duration-300 hover:text-secondary hover:scale-105 active:scale-95"
            onClick={(e) => handleNavLinkClick(e, "/")}
          >
            Quantum Alliance
          </a>

          {/* Desktop Navigation - hidden on mobile */}
          <nav className="hidden md:block" aria-label="Main navigation">
            <ul className="flex space-x-8">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className={`group relative px-3 py-2 text-sm font-medium transition-all duration-300 rounded-lg ${
                      isActive(link.href) 
                        ? "text-secondary bg-secondary/10 font-semibold" 
                        : "text-text-light/90 hover:text-secondary hover:bg-white/5"
                    }`}
                    onClick={(e) => handleNavLinkClick(e, link.href)}
                    aria-current={isActive(link.href) ? "page" : undefined}
                  >
                    {link.name}
                    {isActive(link.href) && (
                      <span className="absolute -bottom-1 left-1/2 h-0.5 w-8 -translate-x-1/2 bg-secondary rounded-full"></span>
                    )}
                    {!isActive(link.href) && (
                      <span className="absolute -bottom-1 left-1/2 h-0.5 w-0 -translate-x-1/2 bg-secondary rounded-full transition-all duration-300 group-hover:w-8"></span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`z-10 flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 shadow-lg ${
              isMenuOpen 
                ? "bg-secondary text-white rotate-90 scale-110"
                : "bg-secondary/90 text-white hover:bg-secondary hover:scale-105 active:scale-95"
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
        className={`fixed inset-0 z-40 flex items-center justify-center bg-gradient-to-br from-background-black via-background-black to-neutral-dark backdrop-blur-xl transition-all duration-500 overflow-y-auto ${
          isMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ maxHeight: '100vh' }}
      >
        <nav id="fullscreen-nav" className="container-padding mx-auto max-w-4xl w-full">
          <ul className="flex flex-col items-center justify-center space-y-8 py-12">
            {navLinks.map((link, index) => (
              <li key={link.name} className="w-full text-center py-2">
                <a
                  href={link.href}
                  className={`block text-3xl font-medium transition-all duration-500 hover:text-secondary hover:scale-110 md:text-5xl ${
                    isActive(link.href) 
                      ? "text-secondary font-bold scale-105" 
                      : "text-text-light/90"
                  } ${isMenuOpen ? 'animate-fade-in' : ''}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={(e) => handleNavLinkClick(e, link.href)}
                  aria-current={isActive(link.href) ? "page" : undefined}
                >
                  {link.name}
                  {isActive(link.href) && (
                    <span className="block mx-auto mt-3 h-1 w-24 bg-secondary rounded-full animate-pulse"></span>
                  )}
                </a>
              </li>
            ))}
            <li className="pt-12 w-full text-center">
              <a
                href="/submit-a-challenge"
                className={`inline-block rounded-full bg-gradient-to-r from-secondary to-accent px-10 py-5 text-xl font-semibold text-white transition-all hover:scale-110 hover:shadow-2xl active:scale-95 ${isMenuOpen ? 'animate-fade-in' : ''}`}
                style={{ animationDelay: `${navLinks.length * 100}ms` }}
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
