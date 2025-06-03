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
        const newLikedComments = new Set(likedComments);
        newLikedComments.add(commentId);
        set({ likedComments: newLikedComments });
      },
      
      hasLikedComment: (commentId) => {
        const { likedComments } = get();
        return likedComments.has(commentId);
      },
      
      // Newsletter subscription
      setNewsletterSubscription: (subscribed) => set({ isSubscribedToNewsletter: subscribed }),
      
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
        const parsed = JSON.parse(str);
        return {
          state: {
            ...parsed,
            likedComments: new Set(parsed.likedComments || []),
          },
          version: parsed.version,
        };
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
