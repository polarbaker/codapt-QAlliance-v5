import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Upload state tracking for recovery and persistence
interface UploadState {
  id: string;
  fileName: string;
  filePath?: string;
  status: 'uploading' | 'processing' | 'verifying' | 'verified' | 'failed';
  progress: number;
  timestamp: number;
  error?: string;
  retryCount: number;
  verificationAttempts?: number;
}

interface RecentUploadsState {
  uploads: UploadState[];
  maxUploads: number;
}

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
  
  // Recent uploads tracking
  recentUploads: RecentUploadsState;
  addUpload: (upload: Omit<UploadState, 'id' | 'timestamp'>) => string;
  updateUpload: (id: string, updates: Partial<UploadState>) => void;
  removeUpload: (id: string) => void;
  clearOldUploads: () => void;
  getUploadById: (id: string) => UploadState | undefined;
  getUploadsByStatus: (status: UploadState['status']) => UploadState[];
  
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
  recentUploads: {
    uploads: [],
    maxUploads: 10,
  } as RecentUploadsState,
};

// Helper function to safely apply theme
const applyTheme = (theme: 'light' | 'dark' | 'system') => {
  if (typeof window === 'undefined') return;
  
  try {
    let shouldUseDark = false;
    
    if (theme === 'system') {
      shouldUseDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      shouldUseDark = theme === 'dark';
    }
    
    document.documentElement.classList.toggle('dark', shouldUseDark);
  } catch (error) {
    console.warn('Failed to apply theme:', error);
  }
};

// Helper function to safely create Set from array
const safeCreateSet = (data: unknown): Set<number> => {
  try {
    if (Array.isArray(data)) {
      return new Set(data.filter(item => typeof item === 'number'));
    }
    if (data instanceof Set) {
      return new Set([...data].filter(item => typeof item === 'number'));
    }
  } catch (error) {
    console.warn('Failed to create Set from data:', error);
  }
  return new Set<number>();
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      ...defaultState,
      
      // Theme management with improved error handling
      setThemePreference: (theme) => {
        set({ themePreference: theme });
        applyTheme(theme);
      },
      
      // Profile management
      setName: (name) => set({ name: name.trim() }),
      setAvatar: (avatar) => set({ avatar }),
      
      // Comment interactions with improved Set handling
      likeComment: (commentId) => {
        if (typeof commentId !== 'number' || !Number.isInteger(commentId)) {
          console.warn('Invalid commentId provided to likeComment:', commentId);
          return;
        }
        
        const { likedComments } = get();
        const currentLikedComments = likedComments instanceof Set ? likedComments : safeCreateSet(likedComments);
        
        const newLikedComments = new Set(currentLikedComments);
        newLikedComments.add(commentId);
        set({ likedComments: newLikedComments });
      },
      
      hasLikedComment: (commentId) => {
        if (typeof commentId !== 'number' || !Number.isInteger(commentId)) {
          console.warn('Invalid commentId provided to hasLikedComment:', commentId);
          return false;
        }
        
        const { likedComments } = get();
        const currentLikedComments = likedComments instanceof Set ? likedComments : safeCreateSet(likedComments);
        
        return currentLikedComments.has(commentId);
      },
      
      // Newsletter subscription
      setNewsletterSubscription: (subscribed) => set({ isSubscribedToNewsletter: Boolean(subscribed) }),
      
      // Admin authentication with validation
      setAdminAuth: (token) => {
        if (typeof token !== 'string' || token.trim().length === 0) {
          console.warn('Invalid token provided to setAdminAuth');
          return;
        }
        
        set({ 
          isAdminLoggedIn: true, 
          adminToken: token.trim() 
        });
      },
      
      clearAdminAuth: () => set({ 
        isAdminLoggedIn: false, 
        adminToken: null 
      }),
      
      // Preferences management with validation
      updatePreferences: (newPreferences) => {
        const { preferences } = get();
        
        // Validate new preferences
        const validatedPreferences = { ...preferences };
        
        if (typeof newPreferences.showAnimations === 'boolean') {
          validatedPreferences.showAnimations = newPreferences.showAnimations;
        }
        if (typeof newPreferences.emailNotifications === 'boolean') {
          validatedPreferences.emailNotifications = newPreferences.emailNotifications;
        }
        if (typeof newPreferences.pushNotifications === 'boolean') {
          validatedPreferences.pushNotifications = newPreferences.pushNotifications;
        }
        
        set({ preferences: validatedPreferences });
      },
      
      // Recent uploads management
      addUpload: (upload) => {
        const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newUpload: UploadState = {
          ...upload,
          id,
          timestamp: Date.now(),
          retryCount: upload.retryCount || 0,
        };
        
        set((state) => {
          const uploads = [...state.recentUploads.uploads, newUpload];
          
          // Keep only the most recent uploads
          if (uploads.length > state.recentUploads.maxUploads) {
            uploads.splice(0, uploads.length - state.recentUploads.maxUploads);
          }
          
          return {
            recentUploads: {
              ...state.recentUploads,
              uploads,
            },
          };
        });
        
        return id;
      },

      updateUpload: (id, updates) => {
        set((state) => {
          const uploads = state.recentUploads.uploads.map(upload =>
            upload.id === id ? { ...upload, ...updates } : upload
          );
          
          return {
            recentUploads: {
              ...state.recentUploads,
              uploads,
            },
          };
        });
      },

      removeUpload: (id) => {
        set((state) => {
          const uploads = state.recentUploads.uploads.filter(upload => upload.id !== id);
          
          return {
            recentUploads: {
              ...state.recentUploads,
              uploads,
            },
          };
        });
      },

      clearOldUploads: () => {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
        
        set((state) => {
          const uploads = state.recentUploads.uploads.filter(
            upload => upload.timestamp > oneDayAgo
          );
          
          return {
            recentUploads: {
              ...state.recentUploads,
              uploads,
            },
          };
        });
      },

      getUploadById: (id) => {
        const { recentUploads } = get();
        return recentUploads.uploads.find(upload => upload.id === id);
      },

      getUploadsByStatus: (status) => {
        const { recentUploads } = get();
        return recentUploads.uploads.filter(upload => upload.status === status);
      },
      
      // Reset functions
      resetProfile: () => set({ 
        name: defaultState.name, 
        avatar: defaultState.avatar 
      }),
      
      resetAll: () => {
        set(defaultState);
        applyTheme(defaultState.themePreference);
      },
    }),
    {
      name: 'quantum-alliance-user-store',
      version: 1,
      
      // Improved serialization with better error handling
      serialize: (state) => {
        try {
          const serializedState = {
            ...state.state,
            likedComments: Array.from(state.state.likedComments),
            recentUploads: {
              ...state.state.recentUploads,
              uploads: state.state.recentUploads.uploads || [],
            },
          };
          return JSON.stringify(serializedState);
        } catch (error) {
          console.warn('Failed to serialize user store:', error);
          return JSON.stringify({ 
            ...defaultState, 
            likedComments: [],
            recentUploads: defaultState.recentUploads,
          });
        }
      },
      
      // Improved deserialization with validation
      deserialize: (str) => {
        try {
          const parsed = JSON.parse(str);
          
          // Validate and sanitize the parsed data
          const sanitizedState = {
            themePreference: ['light', 'dark', 'system'].includes(parsed.themePreference) 
              ? parsed.themePreference 
              : defaultState.themePreference,
            name: typeof parsed.name === 'string' ? parsed.name : defaultState.name,
            avatar: typeof parsed.avatar === 'string' ? parsed.avatar : defaultState.avatar,
            likedComments: safeCreateSet(parsed.likedComments),
            isSubscribedToNewsletter: Boolean(parsed.isSubscribedToNewsletter),
            isAdminLoggedIn: Boolean(parsed.isAdminLoggedIn),
            adminToken: typeof parsed.adminToken === 'string' ? parsed.adminToken : null,
            preferences: {
              showAnimations: typeof parsed.preferences?.showAnimations === 'boolean' 
                ? parsed.preferences.showAnimations 
                : defaultState.preferences.showAnimations,
              emailNotifications: typeof parsed.preferences?.emailNotifications === 'boolean' 
                ? parsed.preferences.emailNotifications 
                : defaultState.preferences.emailNotifications,
              pushNotifications: typeof parsed.preferences?.pushNotifications === 'boolean' 
                ? parsed.preferences.pushNotifications 
                : defaultState.preferences.pushNotifications,
            },
            recentUploads: {
              uploads: Array.isArray(parsed.recentUploads?.uploads) 
                ? parsed.recentUploads.uploads.filter((upload: any) => 
                    upload && typeof upload === 'object' && 
                    typeof upload.id === 'string' &&
                    typeof upload.fileName === 'string' &&
                    typeof upload.status === 'string' &&
                    typeof upload.timestamp === 'number'
                  )
                : [],
              maxUploads: typeof parsed.recentUploads?.maxUploads === 'number' 
                ? parsed.recentUploads.maxUploads 
                : defaultState.recentUploads.maxUploads,
            },
          };
          
          return {
            state: sanitizedState,
            version: parsed.version || 1,
          };
        } catch (error) {
          console.warn('Failed to deserialize user store, using default state:', error);
          return {
            state: defaultState,
            version: 1,
          };
        }
      },
      
      // Migration function for version updates
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migration from version 0 to 1
          return {
            ...persistedState,
            likedComments: safeCreateSet(persistedState.likedComments),
          };
        }
        return persistedState;
      },
    }
  )
);

// Initialize theme on app load with improved error handling
if (typeof window !== 'undefined') {
  try {
    const store = useUserStore.getState();
    const { themePreference } = store;
    
    applyTheme(themePreference);
    
    // Listen for system theme changes with error handling
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      try {
        const currentTheme = useUserStore.getState().themePreference;
        if (currentTheme === 'system') {
          applyTheme('system');
        }
      } catch (error) {
        console.warn('Failed to handle system theme change:', error);
      }
    };
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    // Cleanup function (though it won't be called in this context)
    const cleanup = () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
    
    // Store cleanup function for potential future use
    (window as any).__themeCleanup = cleanup;
  } catch (error) {
    console.warn('Failed to initialize theme system:', error);
  }
}
