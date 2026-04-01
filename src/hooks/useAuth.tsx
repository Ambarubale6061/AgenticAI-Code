import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { uploadAvatar } from "@/lib/supabaseStorage";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, avatarFile?: File) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (fullName: string) => Promise<{ error: string | null }>;
  updateAvatar: (avatarFile: File) => Promise<{ error: string | null }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string, avatarFile?: File) => {
    // First, create the user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (signUpError) return { error: signUpError.message };

    // If avatar provided and user created, upload avatar and update metadata
    if (avatarFile && data.user) {
      try {
        const avatarUrl = await uploadAvatar(data.user.id, avatarFile);
        // Update user metadata with avatar URL
        await supabase.auth.updateUser({
          data: { full_name: fullName, avatar_url: avatarUrl },
        });
        // Refresh user state
        const { data: updatedUser } = await supabase.auth.getUser();
        setUser(updatedUser.user);
      } catch (err) {
        // Avatar upload failed but user is created; log and continue
        console.error("Avatar upload failed:", err);
      }
    }

    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateProfile = useCallback(async (fullName: string) => {
    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });
    if (!error && data.user) {
      setUser(data.user);
    }
    return { error: error?.message ?? null };
  }, []);

  const updateAvatar = useCallback(async (avatarFile: File) => {
    if (!user) return { error: "No user" };
    try {
      const avatarUrl = await uploadAvatar(user.id, avatarFile);
      const { data, error } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, avatar_url: avatarUrl },
      });
      if (error) return { error: error.message };
      setUser(data.user);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Upload failed" };
    }
  }, [user]);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    // First verify current password by attempting to sign in again
    if (!user?.email) return { error: "No user email" };
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) return { error: "Current password is incorrect" };

    // Update password
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, updateProfile, updateAvatar, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}