import { HerculesAuthProvider } from "@usehercules/auth/react";

// Custom localStorage-based state store for OIDC
// This is critical for PWA (standalone mode) on iOS Safari:
// - iOS PWA uses a separate storage context from the browser
// - When redirecting to the external auth portal and back, sessionStorage
//   is cleared between the two contexts, breaking the OIDC flow
// - Using localStorage persists state across these context switches
const localStorageStore = {
  set: (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage quota exceeded or unavailable — silently fail
    }
    return Promise.resolve();
  },
  get: (key: string): Promise<string | null> => {
    try {
      return Promise.resolve(localStorage.getItem(key));
    } catch {
      return Promise.resolve(null);
    }
  },
  remove: (key: string): Promise<string | null> => {
    try {
      const value = localStorage.getItem(key);
      localStorage.removeItem(key);
      return Promise.resolve(value);
    } catch {
      return Promise.resolve(null);
    }
  },
  getAllKeys: (): Promise<string[]> => {
    try {
      return Promise.resolve(Object.keys(localStorage));
    } catch {
      return Promise.resolve([]);
    }
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authority = import.meta.env.VITE_HERCULES_OIDC_AUTHORITY;
  const clientId = import.meta.env.VITE_HERCULES_OIDC_CLIENT_ID;

  if (!authority || !clientId) {
    // Fallback or warning if environment variables are not set yet
    console.warn("Hercules OIDC configuration is missing. Authentication might fail.");
  }

  return (
    <HerculesAuthProvider
      authority={authority || ""}
      client_id={clientId || ""}
      userManagerSettings={{
        redirect_uri: `${window.location.origin}/auth/callback`,
        post_logout_redirect_uri: window.location.origin,
        stateStore: localStorageStore as any, // Cast as any because of OIDC client typing details
      }}
    >
      {children}
    </HerculesAuthProvider>
  );
}

