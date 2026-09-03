import { useState, type FormEvent } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Button, Card, PageHeader, Skeleton, Toast } from "./components/ui";
import { Header, MobileNavigation, Sidebar } from "./components/layout";
import { DashboardPage } from "./pages/DashboardPage";
import { ProfilePage, SocialPage } from "./pages/SocialPages";
import {
  EnhancedBudgets,
  EnhancedBudgetDetail,
  EnhancedCalendar,
  EnhancedCards,
  EnhancedGroupDetail,
  EnhancedGroups,
  EnhancedPiggyBanks,
  EnhancedReports,
  EnhancedSettings,
  EnhancedTransactions,
} from "./pages/EnhancedPages";
import { AppDataProvider, useAppData } from "./providers/AppDataProvider";
import { preferences } from "./services/preferences";
import { api } from "./services/api";

function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const register = location.pathname === "/register";
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("joao@cofrin.app");
  const [password, setPassword] = useState("cofrin");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  if (preferences.getBoolean("cofrin-demo"))
    return <Navigate to="/dashboard" replace />;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email))
      return setError("Informe um e-mail válido.");
    if (register && name.trim().length < 2)
      return setError("Informe seu nome.");
    if (register) {
      try {
        const availability = await api.usernameAvailability(username);
        if (!availability.available) return setError(availability.message ?? "Esse @ já está em uso.");
      } catch {
        return setError("Não foi possível validar seu @username agora.");
      }
    }
    if (register && (password.length < 6 || password !== confirm))
      return setError(
        "Use uma senha de pelo menos 6 caracteres e confirme corretamente.",
      );
    preferences.setBoolean("cofrin-demo", true);
    navigate("/dashboard", { replace: true });
  };
  return (
    <div className="auth-page">
      <div className="auth-layout">
        <div className="auth-branding">
          <span className="logo-mark">C</span>
          <h1>
            Controle hoje.
            <br />
            Planeje amanhã.
            <br />
            <em>Compartilhe objetivos.</em>
          </h1>
          <p>
            cofrin reúne sua vida financeira e os planos que vocês constroem
            juntos.
          </p>
        </div>
        <Card className="auth-card">
          <div className="brand-auth">
            <span className="logo-mark">C</span> cofrin
          </div>
          <h1>
            {register ? "Crie sua conta" : "Sua vida financeira, em ordem."}
          </h1>
          <p>
            {register
              ? "Comece a organizar seu dinheiro em minutos."
              : "Entre na demonstração para explorar seu cofrinho digital."}
          </p>
          <form onSubmit={submit}>
            {register && (
              <div className="form-field">
                <label>Nome</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Seu nome"
                />
              </div>
            )}
            {register && (
              <div className="form-field">
                <label>@username</label>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value.replace(/^@+/, ""))}
                  placeholder="joaobraga"
                />
              </div>
            )}
            <div className="form-field">
              <label>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {register && (
              <div className="form-field">
                <label>Confirmar senha</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </div>
            )}
            {error && <p className="form-error">{error}</p>}
            <p className="demo-hint">
              Dados de demonstração: qualquer credencial válida libera o acesso.
            </p>
            <Button
              type="submit"
              style={{ width: "100%", justifyContent: "center" }}
            >
              {register ? "Criar conta" : "Entrar na demonstração"}
            </Button>
          </form>
          <p className="auth-switch">
            {register ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Entrar" : "Criar conta"}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
function ShellContent({
  mobileOpen,
  setMobileOpen,
}: {
  mobileOpen: boolean;
  setMobileOpen: (value: boolean) => void;
}) {
  const { loading, error, refresh, toast } = useAppData();
  const content = loading ? (
    <div className="page-loading" aria-live="polite">
      <Skeleton lines={6} />
    </div>
  ) : error ? (
    <Card className="data-error">
      <h2>Não foi possível carregar seus dados</h2>
      <p>{error}</p>
      <Button onClick={() => void refresh()}>Tentar novamente</Button>
    </Card>
  ) : (
    <Routes>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/transactions" element={<EnhancedTransactions />} />
      <Route path="/calendar" element={<EnhancedCalendar />} />
      <Route path="/cards" element={<EnhancedCards />} />
      <Route path="/piggy-banks" element={<EnhancedPiggyBanks />} />
      <Route path="/groups" element={<EnhancedGroups />} />
      <Route path="/groups/:id" element={<EnhancedGroupDetail />} />
      <Route path="/budgets" element={<EnhancedBudgets />} />
      <Route path="/budgets/:id" element={<EnhancedBudgetDetail />} />
      <Route path="/reports" element={<EnhancedReports />} />
      <Route path="/social" element={<SocialPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/u/:username" element={<ProfilePage publicProfile />} />
      <Route path="/settings" element={<EnhancedSettings />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <Header onMenu={() => setMobileOpen(true)} />
      <main className="main">{content}</main>
      <AnimatePresence>{toast && <Toast message={toast} />}</AnimatePresence>
      <MobileNavigation />
    </div>
  );
}
function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <AppDataProvider>
      <ShellContent mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
    </AppDataProvider>
  );
}
function NotFound() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        title="Página não encontrada"
        description="O endereço que você tentou acessar não existe."
      />
      <Button onClick={() => navigate("/dashboard")}>Voltar ao início</Button>
    </>
  );
}
export default function App() {
  const authenticated = preferences.getBoolean("cofrin-demo");
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate to={authenticated ? "/dashboard" : "/login"} replace />
        }
      />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route
        path="/*"
        element={authenticated ? <Shell /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}
