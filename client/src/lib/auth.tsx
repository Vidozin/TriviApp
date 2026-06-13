import { createContext, useContext, ReactNode } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetAuthStatus, getGetAuthStatusQueryKey, useHostLogout } from "./api";

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetAuthStatus({
    query: { queryKey: getGetAuthStatusQueryKey(), retry: false },
  });

  const logoutMutation = useHostLogout({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() });
        setLocation("/host/login");
      },
    },
  });

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!data?.authenticated,
        isLoading,
        logout: () => logoutMutation.mutate(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
