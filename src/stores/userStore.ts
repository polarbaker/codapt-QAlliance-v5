import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserStore {
  // Theme preferences
  themePreference: 'light' | 'dark' | 'system';
  setThemePreference: (theme: 'light' | 'dark' | 'system') => void;
  
  // User profile
  name: string;
  setName: (name: string) => void;
  avatar: string;
  setAvatar: (avatar: string) => void;
  
  // Comment interactions
  likedComments: Set<number>;
  likeComment: (commentId: number) => void;
  hasLikedComment: (commentId: number) => boolean;
  
  // Newsletter subscription status
  isSubscribedToNewsletter: boolean;
  setNewsletterSubscription: (subscribed: boolean) => void;
  
  // Admin authentication
  isAdminLoggedIn: boolean;
  adminToken: string | null;
  setAdminAuth: (token: string) => void;
  clearAdminAuth: () => void;
  
  // User preferences
  preferences: {
    showAnimations: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
  };
  updatePreferences: (preferences: Partial<UserStore['preferences']>) => void;
  
  // Reset functions
  resetProfile: () => void;
  resetAll: () => void;
}

const defaultState = {
  themePreference: 'system' as const,
  name: '',
  avatar: 'bg-secondary',
  likedComments: new Set<number>(),
  isSubscribedToNewsletter: false,
  isAdminLoggedIn: false,
  adminToken: null,
  preferences: {
    showAnimations: true,
    emailNotifications: true,
    pushNotifications: false,
  },
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      ...defaultState,
      
      // Theme management
      setThemePreference: (theme) => {
        set({ themePreference: theme });
        
        // Apply theme to document
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          document.documentElement.classList.toggle('dark', systemTheme === 'dark');
        } else {
          document.documentElement.classList.toggle('dark', theme === 'dark');
        }
      },
      
      // Profile management
      setName: (name) => set({ name }),
      setAvatar: (avatar) => set({ avatar }),
      
      // Comment interactions
      likeComment: (commentId) => {
        const { likedComments } = get();
        // Defensive programming: ensure likedComments is a Set
        let currentLikedComments = likedComments;
        if (!currentLikedComments || typeof currentLikedComments.has !== 'function') {
          console.warn('likedComments is not a Set, reinitializing...');
          currentLikedComments = new Set();
        }
        const newLikedComments = new Set(currentLikedComments);
        newLikedComments.add(commentId);
        set({ likedComments: newLikedComments });
      },
      
      hasLikedComment: (commentId) => {
        const { likedComments } = get();
        // Defensive programming: ensure likedComments is a Set
        if (!likedComments || typeof likedComments.has !== 'function') {
          console.warn('likedComments is not a Set, reinitializing...');
          set({ likedComments: new Set() });
          return false;
        }
        return likedComments.has(commentId);
      },
      
      // Newsletter subscription
      setNewsletterSubscription: (subscribed) => set({ isSubscribedToNewsletter: subscribed }),
      
      // Admin authentication
      setAdminAuth: (token) => set({ 
        isAdminLoggedIn: true, 
        adminToken: token 
      }),
      
      clearAdminAuth: () => set({ 
        isAdminLoggedIn: false, 
        adminToken: null 
      }),
      
      // Preferences management
      updatePreferences: (newPreferences) => {
        const { preferences } = get();
        set({ preferences: { ...preferences, ...newPreferences } });
      },
      
      // Reset functions
      resetProfile: () => set({ 
        name: defaultState.name, 
        avatar: defaultState.avatar 
      }),
      
      resetAll: () => set(defaultState),
    }),
    {
      name: 'quantum-alliance-user-store',
      // Custom serialization to handle Set objects
      serialize: (state) => {
        return JSON.stringify({
          ...state.state,
          likedComments: Array.from(state.state.likedComments),
        });
      },
      deserialize: (str) => {
        try {
          const parsed = JSON.parse(str);
          return {
            state: {
              ...parsed,
              // Ensure likedComments is always a Set, even if it's undefined, null, or not an array
              likedComments: new Set(Array.isArray(parsed.likedComments) ? parsed.likedComments : []),
            },
            version: parsed.version,
          };
        } catch (error) {
          console.warn('Failed to deserialize user store, using default state:', error);
          // Return default state if deserialization fails
          return {
            state: defaultState,
            version: 0,
          };
        }
      },
    }
  )
);

// Initialize theme on app load
if (typeof window !== 'undefined') {
  const store = useUserStore.getState();
  const { themePreference } = store;
  
  if (themePreference === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', systemTheme === 'dark');
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const currentTheme = useUserStore.getState().themePreference;
      if (currentTheme === 'system') {
        document.documentElement.classList.toggle('dark', e.matches);
      }
    });
  } else {
    document.documentElement.classList.toggle('dark', themePreference === 'dark');
  }
}
