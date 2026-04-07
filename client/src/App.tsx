import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import EventCreate from "@/pages/EventCreate";
import ParcoursClient from "@/pages/ParcoursClient";
import Acquisition from "@/pages/Acquisition";
import HubInscription from "@/pages/HubInscription";
import SprintBoard from "@/pages/SprintBoard";
import Login from "@/pages/Login";
import Users from "@/pages/Users";
import Fournisseurs from "@/pages/Fournisseurs";
import NotFound from "@/pages/not-found";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface AuthContext {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

import { createContext, useContext } from "react";
export const AuthCtx = createContext<AuthContext>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
});
export const useAuth = () => useContext(AuthCtx);

function AppInner() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <Router hook={useHashLocation}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overscroll-contain">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/events/new" component={EventCreate} />
            <Route path="/parcours/:id" component={ParcoursClient} />
            <Route path="/parcours" component={ParcoursClient} />
            <Route path="/acquisition" component={Acquisition} />
            <Route path="/inscriptions" component={HubInscription} />
            <Route path="/sprint" component={SprintBoard} />
            <Route path="/users" component={Users} />
              <Route path="/fournisseurs" component={Fournisseurs} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
      <Toaster />
    </Router>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = useCallback((t: string, u: AuthUser) => {
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, token, login, logout }}>
      <QueryClientProvider client={queryClient}>
        <AppInner />
      </QueryClientProvider>
    </AuthCtx.Provider>
  );
}
