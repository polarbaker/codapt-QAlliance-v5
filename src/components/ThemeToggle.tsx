import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useUserStore } from "~/stores/userStore";

export default function ThemeToggle() {
  const { themePreference, setThemePreference } = useUserStore();
  const [mounted, setMounted] = useState(false);
  
  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Apply theme based on preference
  useEffect(() => {
    if (!mounted) return;
    
    const root = window.document.documentElement;
    
    if (themePreference === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.setAttribute('data-theme', 'system');
      // Apply the actual theme class for styling based on system preference
      if (systemTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else {
      root.setAttribute('data-theme', themePreference);
      // Update the class for styling based on explicit preference
      if (themePreference === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [themePreference, mounted]);
  
  // Listen for system theme changes when using system preference
  useEffect(() => {
    if (!mounted) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (themePreference === 'system') {
        const newTheme = mediaQuery.matches ? 'dark' : 'light';
        const root = document.documentElement;
        
        // Keep the data-theme as 'system'
        root.setAttribute('data-theme', 'system');
        
        // Update the class for styling
        if (newTheme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };
    
    // Initial check
    handleChange();
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themePreference, mounted]);
  
  if (!mounted) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-30 flex items-center space-x-1.5 rounded-full bg-background-light/90 p-1.5 shadow-lg backdrop-blur-sm dark:bg-background-black/80 border border-neutral-light/10 dark:border-neutral-dark/20 transition-all duration-300">
      <button
        onClick={() => setThemePreference('light')}
        className={`rounded-full p-2 transition-all duration-300 ${
          themePreference === 'light'
            ? 'bg-secondary text-white shadow-md scale-110'
            : 'text-text-dark hover:bg-neutral-light/30 dark:text-text-light dark:hover:bg-neutral-dark/30 hover:scale-105'
        }`}
        aria-label="Light mode"
        title="Light mode"
      >
        <Sun size={18} className={themePreference === 'light' ? 'animate-pulse' : ''} />
      </button>
      
      <button
        onClick={() => setThemePreference('dark')}
        className={`rounded-full p-2 transition-all duration-300 ${
          themePreference === 'dark'
            ? 'bg-secondary text-white shadow-md scale-110'
            : 'text-text-dark hover:bg-neutral-light/30 dark:text-text-light dark:hover:bg-neutral-dark/30 hover:scale-105'
        }`}
        aria-label="Dark mode"
        title="Dark mode"
      >
        <Moon size={18} className={themePreference === 'dark' ? 'animate-pulse' : ''} />
      </button>
      
      <button
        onClick={() => setThemePreference('system')}
        className={`rounded-full p-2 transition-all duration-300 ${
          themePreference === 'system'
            ? 'bg-secondary text-white shadow-md scale-110'
            : 'text-text-dark hover:bg-neutral-light/30 dark:text-text-light dark:hover:bg-neutral-dark/30 hover:scale-105'
        }`}
        aria-label="System preference"
        title="System preference"
      >
        <Monitor size={18} className={themePreference === 'system' ? 'animate-pulse' : ''} />
      </button>
    </div>
  );
}
