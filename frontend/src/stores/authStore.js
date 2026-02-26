import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { getMyProfile, patchMyProfile } from '../services/profileApi';

const ACCESS_TOKEN_STORAGE_KEY = 'fibula_access_token';

function persistAccessToken(session) {
  if (typeof window === 'undefined') {
    return;
  }

  const token = session?.access_token;

  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

function authStateFromSession(session) {
  return {
    user: session?.user || null,
    session: session || null
  };
}

export const useAuthStore = create((set) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,

  hydrateSession: async () => {
    if (!supabase) {
      set({ isLoading: false, user: null, session: null, profile: null });
      persistAccessToken(null);
      return;
    }

    set({ isLoading: true });
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      set({ isLoading: false, user: null, session: null, profile: null });
      persistAccessToken(null);
      return;
    }

    const session = data?.session || null;
    persistAccessToken(session);
    set({
      isLoading: false,
      ...authStateFromSession(session),
      profile: null
    });
  },

  startAuthListener: () => {
    if (!supabase) {
      return () => {};
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      persistAccessToken(session);
      set({
        isLoading: false,
        ...authStateFromSession(session),
        ...(session ? {} : { profile: null })
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  },

  signInWithGoogle: async () => {
    if (!supabase) {
      return { error: new Error('Supabase client is not configured') };
    }

    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/app` : undefined;

    return supabase.auth.signInWithOAuth({
      provider: 'google',
      ...(redirectTo ? { options: { redirectTo } } : {})
    });
  },

  signOut: async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }

    persistAccessToken(null);
    set({ user: null, session: null, profile: null });
  },

  fetchProfile: async () => {
    try {
      const profile = await getMyProfile();
      set({ profile });
      return { profile, error: null };
    } catch (error) {
      return { profile: null, error };
    }
  },

  updateProfile: async (payload) => {
    try {
      const profile = await patchMyProfile(payload);
      set({ profile });
      return { profile, error: null };
    } catch (error) {
      return { profile: null, error };
    }
  }
}));
