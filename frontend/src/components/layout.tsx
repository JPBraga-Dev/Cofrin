import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PiggyBank,
  ReceiptText,
  Search,
  Settings,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAppData } from "../providers/AppDataProvider";
import { useAuth } from "../providers/AuthProvider";
import { categoryName } from "../utils/selectors";
import { Drawer, DrawerHeader, PrivacyButton, UserAvatar } from "./ui";
import { useDismissableLayer } from "../hooks/useDismissableLayer";

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
    icon: BarChart3,
    section: "análises",
  },
  {
    to: "/social",
    label: "Social",
    icon: MessageCircle,
    section: "social",
  },
  {
    to: "/settings",
    label: "Configurações",
    icon: Settings,
    section: "sistema",
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
  const socialBadge = socialUnread > 99 ? "99+" : String(socialUnread);
  const render = (section: string) =>
    navigationItems
      .filter((item) => item.section === section)
      .map(({ to, label, icon: Icon }) => (
        <div className="sidebar-nav-item-wrap" key={to}>
          <NavLink
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            aria-label={compact ? label : undefined}
            aria-describedby={compact ? `sidebar-tooltip-${to.slice(1)}` : undefined}
          >
            <Icon size={19} />
            <span>{label}</span>
            {to === "/social" && socialUnread > 0 && <i className="nav-badge" aria-label={`${socialUnread} itens sociais não lidos`}>{socialBadge}</i>}
          </NavLink>
          {compact && <span className="sidebar-tooltip" id={`sidebar-tooltip-${to.slice(1)}`} role="tooltip">{label}</span>}
        </div>
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
        <div className="sidebar-header">
          <div className="brand">
          <span className="logo-mark">C</span>
          {!compact && <span>cofrin</span>}
          <button
            className="collapse"
            onClick={() => setCompact(!compact)}
            aria-label={compact ? "Expandir menu" : "Compactar menu"}
          >
            {compact ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Navegação principal">
          <div className="nav-section">{render("principal")}</div>
          <div className="nav-section"><p className="nav-label">Planejamento</p>{render("planejamento")}</div>
          <div className="nav-section"><p className="nav-label">Análises</p>{render("análises")}</div>
          <div className="nav-section"><p className="nav-label">Social</p>{render("social")}</div>
          <div className="nav-section nav-system">{render("sistema")}</div>
        </nav>
        <footer className="sidebar-footer">
        {profile && <div className="sidebar-profile-wrap"><button className="sidebar-user" onClick={() => navigate("/profile")} aria-describedby={compact ? "sidebar-profile-tooltip" : undefined} aria-label="Abrir seu perfil">
          <UserAvatar className="avatar" src={profile.avatarUrl} name={profile.displayName} alt="" />
          <div><strong>{profile.displayName}</strong><small>@{profile.username}</small></div>
          {!compact && <ChevronRight size={15} />}
        </button>{compact && <span className="sidebar-tooltip" id="sidebar-profile-tooltip" role="tooltip"><strong>{profile.displayName}</strong><small>@{profile.username}</small></span>}</div>}
        </footer>
      </aside>
    </>
  );
}

export function Header({ onMenu }: { onMenu: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const {
    hidden,
    setHidden,
    notifications,
    markNotificationRead,
    transactions,
    piggies,
    groups,
    budgets,
    profile,
    searchPeople,
  } = useAppData();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeResult, setActiveResult] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [peopleResults, setPeopleResults] = useState<Awaited<ReturnType<typeof searchPeople>>>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchSequence = useRef(0);
  const contextualTitles: Record<string, { title: string; description: string }> = {
    "/profile": { title: "Perfil", description: "Sua identidade no Cofrin" },
    "/social": { title: "Social", description: "Amigos e conversas" },
    "/settings": { title: "Configurações", description: "Preferências do Cofrin" },
  };
  const detailContext = location.pathname.startsWith("/groups/")
    ? { title: groups.find((item) => item.id === location.pathname.split("/")[2])?.name ?? "Grupo", description: "Planejamento compartilhado" }
    : location.pathname.startsWith("/piggy-banks/")
      ? { title: piggies.find((item) => item.id === location.pathname.split("/")[2])?.name ?? "Porquinho", description: "Meta pessoal" }
      : location.pathname.startsWith("/budgets/")
        ? { title: "Orçamento", description: "Limite e gastos do período" }
        : undefined;
  const contextual = contextualTitles[location.pathname] ?? detailContext ?? (location.pathname.startsWith("/u/") ? { title: "Perfil", description: "Identidade e conexões no Cofrin" } : undefined);
  const page = contextual?.title ?? navigationItems.find((item) => item.to === location.pathname)?.label ?? "cofrin";
  useEffect(() => {
    const sequence = ++searchSequence.current;
    if (query.trim().length < 2) { setPeopleResults([]); setSearching(false); return; }
    const controller = new AbortController();
    setSearching(true);
    const timeout = window.setTimeout(() => void searchPeople(query, controller.signal)
      .then((items) => { if (sequence === searchSequence.current) setPeopleResults(items); })
      .catch((cause) => { if (!(cause instanceof DOMException && cause.name === "AbortError") && sequence === searchSequence.current) setPeopleResults([]); })
      .finally(() => { if (sequence === searchSequence.current) setSearching(false); }), 260);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [query, searchPeople]);
  const results = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("pt-BR");
    if (!value) return [];
    return [
      ...peopleResults.slice(0, 4).map((person) => ({ id: `u-${person.id}`, category: "Pessoas", label: person.displayName, detail: `@${person.username}`, to: `/u/${person.username}` })),
      ...transactions
        .filter((item) =>
          `${item.description} ${categoryName(item.categoryId)}`
            .toLocaleLowerCase("pt-BR")
            .includes(value),
        )
        .slice(0, 4)
        .map((item) => ({
          id: `t-${item.id}`,
          category: "Lançamentos",
          label: item.description,
          detail: categoryName(item.categoryId),
          to: `/transactions?q=${encodeURIComponent(item.description)}`,
        })),
      ...piggies
        .filter((item) => item.name.toLocaleLowerCase("pt-BR").includes(value))
        .slice(0, 3)
        .map((item) => ({
          id: `p-${item.id}`,
          category: "Metas",
          label: item.name,
          detail: "Porquinho",
          to: `/piggy-banks/${item.id}`,
        })),
      ...groups
        .filter((item) => item.name.toLocaleLowerCase("pt-BR").includes(value))
        .slice(0, 3)
        .map((item) => ({
          id: `g-${item.id}`,
          category: "Grupos",
          label: item.name,
          detail: "Planejamento compartilhado",
          to: `/groups/${item.id}`,
        })),
      ...budgets
        .filter((item) => categoryName(item.categoryId).toLocaleLowerCase("pt-BR").includes(value))
        .slice(0, 3)
        .map((item) => ({
          id: `b-${item.id}`,
          category: "Orçamentos",
          label: categoryName(item.categoryId),
          detail: "Limite mensal",
          to: `/budgets/${item.id}`,
        })),
    ];
  }, [query, transactions, piggies, groups, budgets, peopleResults]);
  useEffect(() => setActiveResult(0), [query, results.length]);
  useDismissableLayer(searchRef, searchOpen, () => setSearchOpen(false));
  useDismissableLayer(profileMenuRef, profileMenuOpen, () => setProfileMenuOpen(false));
  useDismissableLayer(notificationRef, notificationOpen, () => setNotificationOpen(false));
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (window.matchMedia("(max-width: 760px)").matches) {
          setMobileSearchOpen(true);
          window.setTimeout(() => mobileSearchInputRef.current?.focus(), 0);
        } else {
          searchInputRef.current?.focus();
          setSearchOpen(true);
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const unread = notifications.filter((item) => !item.read).length;
  const go = (to: string) => {
    navigate(to);
    setQuery("");
    setSearchOpen(false);
    setMobileSearchOpen(false);
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
        <small>{contextual?.description ?? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date())}</small>
      </div>
      <div className="header-actions">
        <button className="icon-button mobile-search-trigger" onClick={() => { setMobileSearchOpen(true); window.setTimeout(() => mobileSearchInputRef.current?.focus(), 0); }} aria-label="Buscar no Cofrin"><Search size={18} /></button>
        <div className="search-wrap" ref={searchRef}>
          <div className={`search ${searchOpen ? "open" : ""}`}>
            <Search size={16} aria-hidden="true" />
            <input
              ref={searchInputRef}
              aria-label="Buscar"
              role="combobox"
              aria-expanded={searchOpen && Boolean(query)}
              aria-controls="global-search-results"
              aria-activedescendant={results[activeResult] ? `search-result-${results[activeResult].id}` : undefined}
              value={query}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") { event.preventDefault(); setActiveResult((value) => Math.min(results.length - 1, value + 1)); }
                if (event.key === "ArrowUp") { event.preventDefault(); setActiveResult((value) => Math.max(0, value - 1)); }
                if (event.key === "Enter" && results[activeResult]) go(results[activeResult].to);
                if (event.key === "Escape") setSearchOpen(false);
              }}
              placeholder="Buscar no Cofrin"
            />
            {query ? <button className="search-clear" onClick={() => { setQuery(""); searchInputRef.current?.focus(); }} aria-label="Limpar busca"><X size={15} /></button> : <kbd>Ctrl K</kbd>}
          </div>
          {searchOpen && query && (
            <div className="search-panel" id="global-search-results" role="listbox">
              {searching && <p className="search-status">Buscando pessoas...</p>}
              {results.length ? (
                results.map((result, index) => (
                  <div className="search-result-group" key={result.id}>
                    {(index === 0 || results[index - 1].category !== result.category) && <span className="search-category">{result.category}</span>}
                  <button id={`search-result-${result.id}`} role="option" aria-selected={index === activeResult} className={index === activeResult ? "active" : ""} onMouseEnter={() => setActiveResult(index)} onClick={() => go(result.to)}>
                    <strong>{result.label}</strong>
                    <small>{result.detail}</small>
                  </button>
                  </div>
                ))
              ) : !searching && (
                <p>Nenhum resultado encontrado.</p>
              )}
            </div>
          )}
        </div>
        <PrivacyButton hidden={hidden} onClick={() => setHidden(!hidden)} />
        <div className="notification-wrap" ref={notificationRef}>
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
                  <span className={`notification-status-dot ${item.read ? "read" : ""}`} aria-hidden="true" />
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.message}</small>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="profile-menu-wrap" ref={profileMenuRef}>
          <button className="avatar header-avatar" onClick={() => setProfileMenuOpen((value) => !value)} aria-label="Abrir menu da conta" aria-expanded={profileMenuOpen}><UserAvatar className="header-avatar-image" src={profile?.avatarUrl} name={profile?.displayName ?? "Usuário"} alt="" /></button>
          {profileMenuOpen && <div className="profile-menu"><div><strong>{profile?.displayName}</strong><small>@{profile?.username}</small></div><button onClick={() => { setProfileMenuOpen(false); navigate("/profile"); }}><UserRound size={16} />Perfil</button><button onClick={() => { setProfileMenuOpen(false); navigate("/settings"); }}><Settings size={16} />Configurações</button><button className="logout" onClick={() => void logout()}><LogOut size={16} />Sair</button></div>}
        </div>
      </div>
      <Drawer open={mobileSearchOpen} onClose={() => setMobileSearchOpen(false)}>
        <div className="mobile-search-sheet">
          <DrawerHeader eyebrow="Busca global" title="Buscar no Cofrin" description="Encontre lançamentos, pessoas, metas, grupos e orçamentos." />
          <div className="mobile-search-field"><Search size={17} aria-hidden="true" /><input ref={mobileSearchInputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite pelo menos 2 caracteres" aria-label="Buscar no Cofrin" />{query && <button onClick={() => setQuery("")} aria-label="Limpar busca"><X size={16} /></button>}</div>
          <div className="mobile-search-results" aria-live="polite">
            {searching && <p className="search-status">Buscando pessoas...</p>}
            {query.trim().length >= 2 && results.length > 0 && results.map((result, index) => <div className="search-result-group" key={result.id}>{(index === 0 || results[index - 1].category !== result.category) && <span className="search-category">{result.category}</span>}<button onClick={() => go(result.to)}><strong>{result.label}</strong><small>{result.detail}</small></button></div>)}
            {query.trim().length >= 2 && !searching && results.length === 0 && <p>Nenhum resultado encontrado.</p>}
          </div>
        </div>
      </Drawer>
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
