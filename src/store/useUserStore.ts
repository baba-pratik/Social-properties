import { create } from 'zustand';
import { Profile } from '../types/database';
import { User } from '@supabase/supabase-js';

interface UserState {
  sessionUser: User | null;
  setSessionUser: (user: User | null) => void;
  currentUser: Profile | null;
  isGuest: boolean;
  setCurrentUser: (user: Profile | null) => void;
  authModalOpen: boolean;
  setAuthModalOpen: (isOpen: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  sessionUser: null,
  setSessionUser: (user) => set({ sessionUser: user }),
  currentUser: null,
  isGuest: true,
  setCurrentUser: (user) => set({ currentUser: user, isGuest: !user }),
  authModalOpen: false,
  setAuthModalOpen: (isOpen) => set({ authModalOpen: isOpen }),
}));
