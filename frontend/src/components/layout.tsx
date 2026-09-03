import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  PiggyBank,
  ReceiptText,
  Settings,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAppData } from "../providers/AppDataProvider";
import { categoryName } from "../utils/selectors";
import { Drawer, PrivacyButton } from "./ui";

export const navigationItems = [
  {
    to: "/dashboard",
    label: "Visão geral",
    icon: LayoutDashboard,
    section: "principal",
  },
  {
    to: "/transactions",
    label: "Lançamentos",
    icon: ReceiptText,
    section: "principal",
  },
  {
    to: "/calendar",
    label: "Calendário",
    icon: CalendarDays,
    section: "principal",
  },
  { to: "/cards", label: "Cartões", icon: CreditCard, section: "principal" },
  {
    to: "/piggy-banks",
    label: "Porquinhos",
    icon: PiggyBank,
    section: "planejamento",
  },
  { to: "/groups", label: "Grupos", icon: UsersRound, section: "planejamento" },
  {
    to: "/budgets",
    label: "Orçamentos",
    icon: WalletCards,
    section: "planejamento",
  },
  {
    to: "/reports",
    label: "Relatórios",
    icon: LayoutDashboard,
    section: "análises",
  },
  {
    to: "/social",
    label: "Social",
    icon: UsersRound,
    section: "social",
  },
  {
    to: "/settings",
    label: "Configurações",
    icon: Settings,
    section: "análises",
  },
] as const;

export function Sidebar({
  mobileOpen,
  setMobileOpen,
}: {
  mobileOpen: boolean;
  setMobileOpen: (value: boolean) => void;
}) {
  const { compact, setCompact, profile, friendRequests, conversations } = useAppData();
  const navigate = useNavigate();
  const socialUnread = friendRequests.filter((item) => item.direction === "RECEIVED").length + conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
  const render = (section: string) =>
    navigationItems
      .filter((item) => item.section === section)
      .map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          data-tooltip={compact ? label : undefined}
        >
          <Icon size={19} />
          <span>{label}</span>
          {to === "/social" && socialUnread > 0 && <i className="nav-badge">{socialUnread}</i>}
        </NavLink>
      ));
  return (
    <>
      <div
        className={`mobile-scrim ${mobileOpen ? "shown" : ""}`}
        onClick={() => setMobileOpen(false)}
      />
      <aside
        className={`sidebar ${compact ? "compact" : ""} ${mobileOpen ? "open" : ""}`}
      >
        <div className="brand">
          <span className="logo-mark">C</span>
          {!compact && <span>cofrin</span>}
          <button
            className="collapse"
            onClick={() => setCompact(!compact)}
            aria-label="Compactar menu"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav>
          {render("principal")}
          <p className="nav-label">Planejamento</p>
          {render("planejamento")}
          <p className="nav-label">Análises</p>
          {render("análises")}
          <p className="nav-label">Social</p>
          {render("social")}
        </nav>
        {profile && <button className="sidebar-user" onClick={() => navigate("/profile")} data-tooltip={compact ? "Seu perfil" : undefined}>
          <div className="avatar">{profile.displayName.split(" ").map((name) => name[0]).slice(0, 2).join("")}</div>
          <div><strong>{profile.displayName}</strong><small>@{profile.username}</small></div>
          {!compact && <ChevronRight size={15} />}
        </button>}
      </aside>
    </>
  );
}

export function Header({ onMenu }: { onMenu: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    hidden,
    setHidden,
    notifications,
    markNotificationRead,
    transactions,
    piggies,
    groups,
    profile,
    searchPeople,
  } = useAppData();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [peopleResults, setPeopleResults] = useState<Awaited<ReturnType<typeof searchPeople>>>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const page =
    navigationItems.find((item) => item.to === location.pathname)?.label ??
    "cofrin";
  useEffect(() => {
    if (query.trim().length < 2) { setPeopleResults([]); return; }
    const timeout = window.setTimeout(() => void searchPeople(query).then(setPeopleResults).catch(() => setPeopleResults([])), 260);
    return () => window.clearTimeout(timeout);
  }, [query, searchPeople]);
  const results = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("pt-BR");
    if (!value) return [];
    return [
      ...peopleResults.map((person) => ({ id: `u-${person.id}`, label: person.displayName, detail: `Pessoa · @${person.username}`, to: `/u/${person.username}` })),
      ...transactions
        .filter((item) =>
          `${item.description} ${categoryName(item.categoryId)}`
            .toLocaleLowerCase("pt-BR")
            .includes(value),
        )
        .slice(0, 4)
        .map((item) => ({
          id: `t-${item.id}`,
          label: item.description,
          detail: "Lançamento",
          to: `/transactions?q=${encodeURIComponent(item.description)}`,
        })),
      ...piggies
        .filter((item) => item.name.toLocaleLowerCase("pt-BR").includes(value))
        .slice(0, 3)
        .map((item) => ({
          id: `p-${item.id}`,
          label: item.name,
          detail: "Porquinho",
          to: "/piggy-banks",
        })),
      ...groups
        .filter((item) => item.name.toLocaleLowerCase("pt-BR").includes(value))
        .slice(0, 3)
        .map((item) => ({
          id: `g-${item.id}`,
          label: item.name,
          detail: "Grupo",
          to: `/groups/${item.id}`,
        })),
    ];
  }, [query, transactions, piggies, groups, peopleResults]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      )
        setSearchOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationOpen(false);
      }
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", key);
    };
  }, []);
  const unread = notifications.filter((item) => !item.read).length;
  const go = (to: string) => {
    navigate(to);
    setQuery("");
    setSearchOpen(false);
  };
  return (
    <header>
      <button
        className="icon-button menu-button"
        onClick={onMenu}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>
      <div className="header-title">
        <span>{page}</span>
        <small>
          {new Intl.DateTimeFormat("pt-BR", {
            month: "long",
            year: "numeric",
          }).format(new Date())}
        </small>
      </div>
      <div className="header-actions">
        <div className="search-wrap" ref={searchRef}>
          <div className="search">
            ⌕{" "}
            <input
              aria-label="Buscar"
              value={query}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && results[0]) go(results[0].to);
              }}
              placeholder="Buscar lançamentos, grupos, metas..."
            />
          </div>
          {searchOpen && query && (
            <div className="search-panel">
              {results.length ? (
                results.map((result) => (
                  <button key={result.id} onClick={() => go(result.to)}>
                    <strong>{result.label}</strong>
                    <small>{result.detail}</small>
                  </button>
                ))
              ) : (
                <p>Nenhum resultado encontrado.</p>
              )}
            </div>
          )}
        </div>
        <PrivacyButton hidden={hidden} onClick={() => setHidden(!hidden)} />
        <div className="notification-wrap">
          <button
            className="icon-button notification"
            aria-label="Notificações"
            aria-expanded={notificationOpen}
            onClick={() => setNotificationOpen((value) => !value)}
          >
            <Bell size={18} />
            {unread > 0 && <i>{unread}</i>}
          </button>
          {notificationOpen && (
            <div className="notification-panel">
              <div className="notification-title">
                <strong>Notificações</strong>
              </div>
              {notifications.map((item) => (
                <button
                  className={`notification-item ${item.read ? "read" : ""}`}
                  onClick={async () => {
                    if (!item.read) await markNotificationRead(item.id);
                    setNotificationOpen(false);
                    if (item.actionUrl) navigate(item.actionUrl);
                  }}
                  key={item.id}
                >
                  <span>{item.read ? "○" : "●"}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.message}</small>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="avatar header-avatar" onClick={() => navigate("/profile")} aria-label="Abrir seu perfil">{profile?.displayName.split(" ").map((name) => name[0]).slice(0, 2).join("") ?? "JB"}</button>
      </div>
    </header>
  );
}

export function MobileNavigation() {
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <>
      <nav className="bottom-nav">
        {navigationItems
          .filter((item) =>
            ["/dashboard", "/transactions", "/piggy-banks", "/groups"].includes(
              item.to,
            ),
          )
          .map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}>
              <Icon size={20} />
              <span>{to === "/dashboard" ? "Início" : label}</span>
            </NavLink>
          ))}
        <button onClick={() => setMoreOpen(true)} aria-label="Mais opções">
          <MoreHorizontal size={20} />
          <span>Mais</span>
        </button>
      </nav>
      <Drawer open={moreOpen} onClose={() => setMoreOpen(false)}>
        <h2>Mais opções</h2>
        {navigationItems
          .filter((item) =>
            [
              "/calendar",
              "/cards",
              "/budgets",
              "/reports",
              "/settings",
              "/social",
            ].includes(item.to),
          )
          .map(({ to, label, icon: Icon }) => (
            <NavLink
              className="more-link"
              onClick={() => setMoreOpen(false)}
              key={to}
              to={to}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
      </Drawer>
    </>
  );
}
