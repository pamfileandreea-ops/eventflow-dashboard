import { Link, useLocation } from "wouter";
import { Calendar, Plus, MapPin, TrendingUp, Users, Kanban, LayoutDashboard, Zap, LogOut, UserCog, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/App";

const nav = [
  { href: "/", icon: LayoutDashboard, label: "Tableau de bord" },
  { href: "/events/new", icon: Plus, label: "Créer un événement" },
  { href: "/parcours", icon: MapPin, label: "Parcours client" },
  { href: "/acquisition", icon: TrendingUp, label: "Acquisition" },
  { href: "/inscriptions", icon: Users, label: "Hub inscription" },
  { href: "/sprint", icon: Kanban, label: "Sprint agile" },
  { href: "/fournisseurs", icon: Handshake, label: "Fournisseurs" },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside
      className="sidebar-gradient flex flex-col w-60 shrink-0 border-r border-sidebar-border"
      data-testid="sidebar"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <svg
          viewBox="0 0 32 32"
          width="32"
          height="32"
          fill="none"
          aria-label="EventFlow logo"
          className="shrink-0"
        >
          <rect width="32" height="32" rx="8" fill="hsl(245 70% 65%)" />
          <rect x="7" y="10" width="18" height="14" rx="2" stroke="white" strokeWidth="1.8" />
          <line x1="7" y1="14" x2="25" y2="14" stroke="white" strokeWidth="1.8" />
          <line x1="13" y1="10" x2="13" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1="19" y1="10" x2="19" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <rect x="11" y="17" width="3" height="3" rx="0.5" fill="white" />
          <rect x="16" y="17" width="3" height="3" rx="0.5" fill="hsl(262 55% 75%)" />
        </svg>
        <div>
          <p className="text-sidebar-accent-foreground font-bold text-sm leading-tight">EventFlow</p>
          <p className="text-sidebar-foreground/60 text-xs">Dashboard MVP</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1" role="navigation">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? location === "/" : location.startsWith(href);
          return (
            <Link key={href} href={href}>
              <a
                data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon size={17} className={active ? "text-sidebar-primary" : ""} />
                {label}
              </a>
            </Link>
          );
        })}

        {/* Admin only: Utilisateurs */}
        {user?.role === "admin" && (
          <Link href="/users">
            <a
              data-testid="nav-utilisateurs"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                location === "/users"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <UserCog size={17} className={location === "/users" ? "text-sidebar-primary" : ""} />
              Utilisateurs
            </a>
          </Link>
        )}
      </nav>

      {/* Logged-in user + logout */}
      <div className="px-4 pb-4 border-t border-sidebar-border pt-3">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-sidebar-accent-foreground truncate">{user?.name || "Utilisateur"}</p>
            <p className="text-[10px] text-sidebar-foreground/60 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Se déconnecter"
            className="text-sidebar-foreground/60 hover:text-red-400 transition-colors p-1 rounded"
            data-testid="button-logout"
          >
            <LogOut size={14} />
          </button>
        </div>

        {/* Integrations badge */}
        <div className="rounded-xl bg-sidebar-accent/50 border border-sidebar-border p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={13} className="text-yellow-400" />
            <span className="text-xs font-semibold text-sidebar-accent-foreground">Intégrations actives</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["Eventbrite", "Bizzabo"].map(p => (
              <span key={p} className="text-[10px] bg-sidebar-accent text-sidebar-foreground px-1.5 py-0.5 rounded">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
