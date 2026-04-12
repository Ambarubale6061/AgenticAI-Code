// src/hooks/useProjects.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// ─── Normalize API base URL (strip trailing slashes) ─────────────────────────
// This ensures the URL is always correct regardless of whether the env var
// was set with or without a trailing slash (e.g. both of these work:
//   VITE_API_BASE_URL=https://agenticai-studio.onrender.com
//   VITE_API_BASE_URL=https://agenticai-studio.onrender.com/
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

let isRedirecting = false;

async function fetchWithAuth(endpoint: string, options: RequestInit = {}, retry = true) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  // Build URL: ensure endpoint always starts with "/" and /api/ prefix is always present
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}/api${normalizedEndpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401) {
    if (retry) {
      await new Promise(r => setTimeout(r, 1000));
      return fetchWithAuth(endpoint, options, false);
    }
    if (!isRedirecting) {
      isRedirecting = true;
      await supabase.auth.signOut();
      window.location.href = "/login";
    }
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }

  return res.json();
}

export interface Project {
  id: string;
  title: string;
  description: string;
  language: string;
  status: string;
  plan: any[];
  generated_code: any[];
  console_output: any[];
  created_at: string;
  updated_at: string;
}

export function useProjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["projects", user?.id],
    enabled: !!user,
    queryFn: () => fetchWithAuth("/projects"),
  });
}

export function useProject(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["project", id],
    enabled: !!user && !!id && id !== "new" && id !== "demo",
    queryFn: () => {
      if (!id || id === "new" || id === "demo") {
        return Promise.reject("Invalid project ID");
      }
      return fetchWithAuth(`/projects/${id}`);
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title?: string; description?: string }) =>
      fetchWithAuth("/projects", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Project> & { id: string }) => {
      if (!id || id === "new" || id === "demo") {
        return Promise.reject("Invalid project ID");
      }
      return fetchWithAuth(`/projects/${id}`, { method: "PUT", body: JSON.stringify(updates) });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", vars.id] });
    },
  });
}

export function useProjectMessages(projectId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["messages", projectId],
    enabled: !!user && !!projectId && projectId !== "new" && projectId !== "demo",
    queryFn: () => {
      if (!projectId || projectId === "new" || projectId === "demo") {
        return Promise.reject("Invalid project ID");
      }
      return fetchWithAuth(`/projects/${projectId}/messages`);
    },
  });
}

export function useSaveMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (msg: { project_id: string; role: string; agent?: string; content: string }) => {
      if (!msg.project_id || msg.project_id === "new" || msg.project_id === "demo") {
        return Promise.reject("Invalid project ID");
      }
      return fetchWithAuth("/projects/messages", { method: "POST", body: JSON.stringify(msg) });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["messages", vars.project_id] });
    },
  });
}