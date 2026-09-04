import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence } from "framer-motion";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, PageHeader, PasswordInput, Skeleton, Toast } from "./components/ui";
import { Header, MobileNavigation, Sidebar } from "./components/layout";
import { AppDataProvider, useAppData } from "./providers/AppDataProvider";
import { useAuth } from "./providers/AuthProvider";
import { api, ApiError } from "./services/api";

const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const EnhancedTransactions = lazy(() => import("./pages/EnhancedPages").then((module) => ({ default: module.EnhancedTransactions })));
const EnhancedPiggyBanks = lazy(() => import("./pages/EnhancedPages").then((module) => ({ default: module.EnhancedPiggyBanks })));
const PiggyBankDetail = lazy(() => import("./pages/EnhancedPages").then((module) => ({ default: module.PiggyBankDetail })));
const EnhancedGroups = lazy(() => import("./pages/EnhancedPages").then((module) => ({ default: module.EnhancedGroups })));
const EnhancedGroupDetail = lazy(() => import("./pages/EnhancedPages").then((module) => ({ default: module.EnhancedGroupDetail })));
const EnhancedCards = lazy(() => import("./pages/FinancialPages").then((module) => ({ default: module.EnhancedCards })));
const EnhancedBudgets = lazy(() => import("./pages/FinancialPages").then((module) => ({ default: module.EnhancedBudgets })));
const EnhancedBudgetDetail = lazy(() => import("./pages/FinancialPages").then((module) => ({ default: module.EnhancedBudgetDetail })));
const EnhancedCalendar = lazy(() => import("./pages/FinancialPages").then((module) => ({ default: module.EnhancedCalendar })));
const EnhancedReports = lazy(() => import("./pages/FinancialPages").then((module) => ({ default: module.EnhancedReports })));
const EnhancedSettings = lazy(() => import("./pages/FinancialPages").then((module) => ({ default: module.EnhancedSettings })));
const SocialPage = lazy(() => import("./pages/SocialPages").then((module) => ({ default: module.SocialPage })));
const ProfilePage = lazy(() => import("./pages/SocialPages").then((module) => ({ default: module.ProfilePage })));

function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, login, register: createAccount } = useAuth();
  const register = location.pathname === "/register";
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "username" | "email" | "password" | "confirm", string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [usernameState, setUsernameState] = useState<"idle" | "checking" | "available" | "unavailable" | "invalid">("idle");
  const abortRef = useRef<AbortController>();
  useEffect(() => {
    if (!register || !username) { setUsernameState("idle"); return; }
    if (!/^[a-z0-9_.]{3,30}$/i.test(username.replace(/^@+/, ""))) { setUsernameState("invalid"); return; }
    setUsernameState("checking");
    abortRef.current?.abort();
    const controller = new AbortController(); abortRef.current = controller;
    const timer = window.setTimeout(() => void api.usernameAvailability(username, controller.signal).then((result) => setUsernameState(result.available ? "available" : "unavailable")).catch((cause) => { if (!(cause instanceof DOMException && cause.name === "AbortError")) setUsernameState("invalid"); }), 400);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [register, username]);
  if (status === "AUTHENTICATED") return <Navigate to="/dashboard" replace />;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (submitting) return; setError(""); setFieldErrors({});
    const nextErrors: typeof fieldErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = "Informe um e-mail válido.";
    if (register && !name.trim()) nextErrors.name = "Informe seu nome.";
    if (register && usernameState !== "available") nextErrors.username = "Escolha um @username disponível.";
    if (password.length < 10 || password.length > 128) nextErrors.password = "Use de 10 a 128 caracteres.";
    if (register && password !== confirm) nextErrors.confirm = "As senhas não coincidem.";
    if (Object.keys(nextErrors).length) { setFieldErrors(nextErrors); return; }
    setSubmitting(true);
    try {
      if (register) await createAccount({ displayName: name, username, email, password }); else await login(email, password);
      const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
      navigate(from?.pathname ? `${from.pathname}${from.search ?? ""}` : "/dashboard", { replace: true });
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "EMAIL_TAKEN") setFieldErrors({ email: cause.message });
      else if (cause instanceof ApiError && cause.code === "USERNAME_TAKEN") setFieldErrors({ username: cause.message });
      else if (cause instanceof ApiError && cause.code === "PASSWORD_INVALID") setFieldErrors({ password: cause.message });
      else setError(cause instanceof ApiError ? cause.message : "Não foi possível conectar ao Cofrin.");
    }
    finally { setSubmitting(false); }
  };
  const stateLabel = { idle: "", checking: "Verificando…", available: "Disponível", unavailable: "Esse @ já está em uso", invalid: "Use 3–30 letras, números, ponto ou sublinhado" }[usernameState];
  return <div className="auth-page"><div className="auth-layout">
    <div className="auth-branding"><span className="logo-mark">C</span><h1>Controle hoje.<br />Planeje amanhã.<br /><em>Compartilhe objetivos.</em></h1><p>cofrin reúne sua vida financeira e os planos que vocês constroem juntos.</p></div>
    <Card className="auth-card">
      <div className="brand-auth"><span className="logo-mark">C</span> cofrin</div>
      <h1>{register ? "Crie sua conta" : "Sua vida financeira, em ordem."}</h1>
      <p>{register ? "Sua conta, identidade e sessão protegidas desde o primeiro acesso." : "Entre com sua conta para continuar."}</p>
      <form onSubmit={submit} noValidate>
        {register && <>
          <div className="form-field"><label htmlFor="displayName">Nome</label><input id="displayName" name="displayName" value={name} onChange={(event) => { setName(event.target.value); setFieldErrors((current) => ({ ...current, name: undefined })); }} autoComplete="name" maxLength={80} required />{fieldErrors.name && <small className="form-error">{fieldErrors.name}</small>}</div>
          <div className="form-field"><label htmlFor="username">@username</label><input id="username" name="username" value={username} onChange={(event) => { setUsername(event.target.value.replace(/^@+/, "")); setFieldErrors((current) => ({ ...current, username: undefined })); }} autoComplete="username" maxLength={30} required /><small className={`field-state ${usernameState}`}>{stateLabel}</small>{fieldErrors.username && <small className="form-error">{fieldErrors.username}</small>}</div>
        </>}
        <div className="form-field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setFieldErrors((current) => ({ ...current, email: undefined })); }} autoComplete="email" maxLength={254} required />{fieldErrors.email && <small className="form-error">{fieldErrors.email}</small>}</div>
        <div className="form-field"><label htmlFor="password">Senha</label><PasswordInput id="password" name="password" value={password} onChange={(value) => { setPassword(value); setFieldErrors((current) => ({ ...current, password: undefined })); }} autoComplete={register ? "new-password" : "current-password"} minLength={10} maxLength={128} required />{register && <small>Use de 10 a 128 caracteres. Frases-senha são aceitas.</small>}{fieldErrors.password && <small className="form-error">{fieldErrors.password}</small>}</div>
        {register && <div className="form-field"><label htmlFor="confirmPassword">Confirmar senha</label><PasswordInput id="confirmPassword" name="confirmPassword" value={confirm} onChange={(value) => { setConfirm(value); setFieldErrors((current) => ({ ...current, confirm: undefined })); }} autoComplete="new-password" minLength={10} maxLength={128} required />{fieldErrors.confirm && <small className="form-error">{fieldErrors.confirm}</small>}</div>}
        {!register && <Link className="forgot-link" to="/forgot-password">Esqueci minha senha</Link>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <Button type="submit" loading={submitting} loadingLabel={register ? "Criando conta…" : "Entrando…"} disabled={submitting || (register && usernameState !== "available")} style={{ width: "100%", justifyContent: "center" }}>{register ? "Criar conta" : "Entrar"}</Button>
      </form>
      {!register && import.meta.env.DEV && <p className="demo-hint">Demonstração: joao@cofrin.app · CofrinDemo2026!</p>}
      <p className="auth-switch">{register ? "Já tem uma conta?" : "Ainda não tem uma conta?"} <Link to={register ? "/login" : "/register"}>{register ? "Entrar" : "Criar conta"}</Link></p>
    </Card>
  </div></div>;
}

function ForgotPasswordPage() {
  const { forgotPassword } = useAuth(); const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  return <div className="auth-page"><Card className="auth-card auth-card-standalone"><div className="brand-auth"><span className="logo-mark">C</span> cofrin</div><h1>Recuperar senha</h1><p>Informe seu e-mail. A resposta é a mesma exista ou não uma conta.</p><form onSubmit={async (event) => { event.preventDefault(); if (loading) return; setLoading(true); setError(""); setMessage(""); try { setMessage(await forgotPassword(email)); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Não foi possível conectar ao Cofrin."); } finally { setLoading(false); } }}><div className="form-field"><label htmlFor="recoveryEmail">E-mail</label><input id="recoveryEmail" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required /></div>{message && <p className="form-success" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}<Button type="submit" loading={loading} loadingLabel="Enviando…" style={{ width: "100%", justifyContent: "center" }}>Enviar instruções</Button></form><p className="auth-switch"><Link to="/login">Voltar para entrar</Link></p></Card></div>;
}

function ResetPasswordPage() {
  const { resetPassword } = useAuth(); const [params] = useSearchParams(); const navigate = useNavigate(); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  return <div className="auth-page"><Card className="auth-card auth-card-standalone"><div className="brand-auth"><span className="logo-mark">C</span> cofrin</div><h1>Definir nova senha</h1><form onSubmit={async (event) => { event.preventDefault(); if (loading) return; setError(""); if (password.length < 10 || password.length > 128) return setError("Use de 10 a 128 caracteres."); if (password !== confirm) return setError("As senhas não coincidem."); setLoading(true); try { await resetPassword(params.get("token") ?? "", password); navigate("/login", { replace: true }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível redefinir a senha."); } finally { setLoading(false); } }}><div className="form-field"><label htmlFor="newPassword">Nova senha</label><PasswordInput id="newPassword" value={password} onChange={setPassword} autoComplete="new-password" /></div><div className="form-field"><label htmlFor="confirmNewPassword">Confirmar senha</label><PasswordInput id="confirmNewPassword" value={confirm} onChange={setConfirm} autoComplete="new-password" /></div>{error && <p className="form-error" role="alert">{error}</p>}<Button type="submit" loading={loading} loadingLabel="Atualizando…" style={{ width: "100%", justifyContent: "center" }}>Salvar nova senha</Button></form></Card></div>;
}

function ShellContent({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (value: boolean) => void }) {
  const { loading, error, refresh, toast } = useAppData();
  const content = loading ? <div className="page-loading" aria-live="polite"><Skeleton lines={6} /></div> : error ? <Card className="data-error"><h2>Não foi possível carregar seus dados</h2><p>{error}</p><Button onClick={() => void refresh()}>Tentar novamente</Button></Card> : <Routes><Route path="/dashboard" element={<DashboardPage />} /><Route path="/transactions" element={<EnhancedTransactions />} /><Route path="/calendar" element={<EnhancedCalendar />} /><Route path="/cards" element={<EnhancedCards />} /><Route path="/piggy-banks" element={<EnhancedPiggyBanks />} /><Route path="/piggy-banks/:id" element={<PiggyBankDetail />} /><Route path="/groups" element={<EnhancedGroups />} /><Route path="/groups/:id" element={<EnhancedGroupDetail />} /><Route path="/budgets" element={<EnhancedBudgets />} /><Route path="/budgets/:id" element={<EnhancedBudgetDetail />} /><Route path="/reports" element={<EnhancedReports />} /><Route path="/social" element={<SocialPage />} /><Route path="/profile" element={<ProfilePage />} /><Route path="/u/:username" element={<ProfilePage publicProfile />} /><Route path="/settings" element={<EnhancedSettings />} /><Route path="*" element={<NotFound />} /></Routes>;
  return <div className="app-shell"><Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} /><Header onMenu={() => setMobileOpen(true)} /><main className="main"><Suspense fallback={<div className="page-loading" aria-live="polite"><Skeleton lines={6} /></div>}>{content}</Suspense></main><AnimatePresence>{toast && <Toast message={toast} />}</AnimatePresence><MobileNavigation /></div>;
}
function Shell() { const [mobileOpen, setMobileOpen] = useState(false); return <AppDataProvider><ShellContent mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} /></AppDataProvider>; }
function NotFound() { const navigate = useNavigate(); return <><PageHeader title="Página não encontrada" description="O endereço que você tentou acessar não existe." /><Button onClick={() => navigate("/dashboard")}>Voltar ao início</Button></>; }
function ProtectedApp() { const { status, error, refreshIdentity } = useAuth(); const location = useLocation(); if (status === "INITIALIZING") return <div className="auth-initializing"><span className="logo-mark">C</span><p>Verificando sua sessão…</p></div>; if (status === "ERROR") return <div className="auth-initializing" role="alert"><span className="logo-mark">C</span><p>{error ?? "Não foi possível verificar sua sessão."}</p><Button onClick={() => void refreshIdentity()}>Tentar novamente</Button></div>; return status === "AUTHENTICATED" ? <Shell /> : <Navigate to="/login" state={{ from: location }} replace />; }

export default function App() {
  const { status } = useAuth();
  return <Routes><Route path="/" element={<Navigate to={status === "AUTHENTICATED" ? "/dashboard" : "/login"} replace />} /><Route path="/login" element={<AuthPage />} /><Route path="/register" element={<AuthPage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/reset-password" element={<ResetPasswordPage />} /><Route path="/*" element={<ProtectedApp />} /></Routes>;
}
