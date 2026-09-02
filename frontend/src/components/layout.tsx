import { useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
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
import { NavLink, useLocation } from "react-router-dom";
import { mockUser, notifications } from "../mocks/data";
import { PrivacyButton } from "./ui";
const main = [
  { to: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { to: "/transactions", label: "Lançamentos", icon: ReceiptText },
  { to: "/calendar", label: "Calendário", icon: CalendarDays },
  { to: "/cards", label: "Cartões", icon: CreditCard },
];
const planning = [
  { to: "/piggy-banks", label: "Porquinhos", icon: PiggyBank },
  { to: "/groups", label: "Grupos", icon: UsersRound },
  { to: "/budgets", label: "Orçamentos", icon: WalletCards },
];
export function Sidebar({
  compact,
  setCompact,
  mobileOpen,
  setMobileOpen,
}: {
  compact: boolean;
  setCompact: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}) {
  const render = (items: typeof main) =>
    items.map(({ to, label, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        onClick={() => setMobileOpen(false)}
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        title={compact ? label : undefined}
      >
        <Icon size={19} />
        <span>{label}</span>
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
          <button className="mobile-close" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav>
          {render(main)}
          <p className="nav-label">Planejamento</p>
          {render(planning)}
          <p className="nav-label">Análises</p>
          {render([
            { to: "/reports", label: "Relatórios", icon: LayoutDashboard },
            { to: "/settings", label: "Configurações", icon: Settings },
          ])}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{mockUser.initials}</div>
          {!compact && (
            <div>
              <strong>{mockUser.name}</strong>
              <small>Plano pessoal</small>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
export function Header({
  hidden,
  setHidden,
  onMenu,
}: {
  hidden: boolean;
  setHidden: (v: boolean) => void;
  onMenu: () => void;
}) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<number[]>([]);
  const page =
    main.concat(planning).find((i) => i.to === location.pathname)?.label ??
    "cofrin";
  const unread = notifications.length - read.length;
  return (
    <header>
      <button className="icon-button menu-button" onClick={onMenu}>
        <Menu size={20} />
      </button>
      <div className="header-title">
        <span>{page}</span>
        <small>Agosto de 2026</small>
      </div>
      <div className="header-actions">
        <div className="search">
          ⌕{" "}
          <input
            aria-label="Buscar"
            placeholder="Buscar transações, grupos, metas..."
          />
        </div>
        <PrivacyButton hidden={hidden} onClick={() => setHidden(!hidden)} />
        <div className="notification-wrap">
          <button
            className="icon-button notification"
            aria-label="Notificações"
            onClick={() => setOpen(!open)}
          >
            <Bell size={18} />
            {unread > 0 && <i>{unread}</i>}
          </button>
          {open && (
            <div className="notification-panel">
              <div className="notification-title">
                <strong>Notificações</strong>
                <button
                  onClick={() =>
                    setRead(notifications.map((_, index) => index))
                  }
                >
                  Marcar todas como lidas
                </button>
              </div>
              {notifications.map((message, index) => (
                <button
                  className={`notification-item ${read.includes(index) ? "read" : ""}`}
                  onClick={() =>
                    setRead((items) =>
                      items.includes(index) ? items : [...items, index],
                    )
                  }
                  key={message}
                >
                  <span>{read.includes(index) ? "○" : "●"}</span>
                  {message}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="avatar">{mockUser.initials}</div>
      </div>
    </header>
  );
}
export function MobileNavigation() {
  return (
    <nav className="bottom-nav">
      {[
        { to: "/dashboard", label: "Início", icon: LayoutDashboard },
        { to: "/transactions", label: "Lançamentos", icon: ReceiptText },
        { to: "/piggy-banks", label: "Porquinhos", icon: PiggyBank },
        { to: "/groups", label: "Grupos", icon: UsersRound },
        { to: "/settings", label: "Mais", icon: MoreHorizontal },
      ].map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to}>
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
