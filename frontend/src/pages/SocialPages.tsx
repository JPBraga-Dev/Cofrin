import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Camera, Check, ChevronLeft, ChevronRight, Copy, ImageIcon, Mail, MessageCircle, Pencil, Search, Send, UserPlus, UsersRound, ZoomIn } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { useAppData } from "../providers/AppDataProvider";
import type { Profile } from "../types";
import { Badge, Button, Card, Drawer, DrawerFooter, DrawerHeader, EmptyState, FormHint, FormSection, PageHeader, SegmentedControl, Skeleton, UserAvatar } from "../components/ui";

export function Avatar({ profile, size = "normal" }: { profile: Pick<Profile, "displayName" | "avatarUrl">; size?: "small" | "normal" | "large" }) {
  return <UserAvatar className={`profile-avatar ${size}`} src={profile.avatarUrl} name={profile.displayName} />;
}
function PersonLink({ profile, children, className = "" }: { profile: Profile; children: React.ReactNode; className?: string }) {
  const navigate = useNavigate();
  return <button className={className} onClick={() => navigate(`/u/${profile.username}`)}>{children}</button>;
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) { setUrl(""); return; }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

function ProfileCover({ src, preview = false, positionX = 50, positionY = 50, zoom = 1 }: { src?: string; preview?: boolean; positionX?: number; positionY?: number; zoom?: number }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!src) { setReady(false); return; }
    let active = true;
    const image = new window.Image();
    image.onload = () => { if (active) setReady(true); };
    image.onerror = () => { if (active) setReady(false); };
    image.src = src;
    return () => { active = false; };
  }, [src]);
  return <div className={`profile-cover ${ready ? "has-image" : "fallback"}`} style={ready ? { backgroundImage: `url("${src}")`, backgroundPosition: `${positionX}% ${positionY}%`, backgroundSize: preview ? `${zoom * 100}%` : "cover" } : undefined} aria-label={ready ? "Capa do perfil" : "Capa padrão do perfil"} />;
}

type CropState = { zoom: number; positionX: number; positionY: number };
const defaultCrop: CropState = { zoom: 1, positionX: 50, positionY: 50 };

export function ProfilePage({ publicProfile = false }: { publicProfile?: boolean }) {
  const { username } = useParams();
  const navigate = useNavigate();
  const {
    profile: ownProfile, friends, friendRequests, conversations, groups, loading, refresh, pending,
    saveProfileChanges,
    sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend, openDirectConversation,
  } = useAppData();
  const [viewedProfile, setViewedProfile] = useState<Profile | null>(publicProfile ? null : ownProfile);
  const [publicLoading, setPublicLoading] = useState(publicProfile);
  const [publicError, setPublicError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [draft, setDraft] = useState({ displayName: "", username: "", bio: "" });
  const [availability, setAvailability] = useState<{ available: boolean; message?: string } | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [copied, setCopied] = useState<"username" | "email" | null>(null);
  const [saveError, setSaveError] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [avatarCrop, setAvatarCrop] = useState<CropState>(defaultCrop);
  const [coverCrop, setCoverCrop] = useState<CropState>(defaultCrop);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const avatarEditor = useRef<HTMLElement>(null);
  const coverEditor = useRef<HTMLElement>(null);
  const identityEditor = useRef<HTMLElement>(null);
  const [initialEditorSection, setInitialEditorSection] = useState<"avatar" | "cover" | "identity">("identity");
  const usernameAbort = useRef<AbortController>();
  const avatarPreview = useObjectUrl(avatarFile);
  const coverPreview = useObjectUrl(coverFile);

  useEffect(() => {
    if (!publicProfile) { setViewedProfile(ownProfile); return; }
    if (!username) return;
    setPublicLoading(true);
    setPublicError(false);
    void api.getUser(username).then(setViewedProfile).catch(() => { setViewedProfile(null); setPublicError(true); }).finally(() => setPublicLoading(false));
  }, [ownProfile, publicProfile, username]);

  useEffect(() => {
    if (!editing || draft.username === ownProfile?.username || draft.username.length < 3) {
      usernameAbort.current?.abort();
      setAvailability(null);
      setCheckingUsername(false);
      return;
    }
    usernameAbort.current?.abort();
    const controller = new AbortController();
    usernameAbort.current = controller;
    setCheckingUsername(true);
    const timeout = window.setTimeout(() => void api.usernameAvailability(draft.username, controller.signal)
      .then(setAvailability)
      .catch((cause) => { if (!(cause instanceof DOMException && cause.name === "AbortError")) setAvailability({ available: false, message: "Não foi possível verificar agora." }); })
      .finally(() => { if (!controller.signal.aborted) setCheckingUsername(false); }), 420);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [draft.username, editing, ownProfile?.username]);

  useEffect(() => {
    if (!editing) return;
    const section = initialEditorSection === "avatar" ? avatarEditor.current : initialEditorSection === "cover" ? coverEditor.current : identityEditor.current;
    const timer = window.setTimeout(() => {
      section?.scrollIntoView({ block: "center", behavior: "smooth" });
      section?.querySelector<HTMLElement>("button, input, textarea")?.focus();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [editing, initialEditorSection]);

  if ((loading && !viewedProfile) || publicLoading) return <ProfileSkeleton />;
  if (!viewedProfile) return publicError
    ? <EmptyState title="Perfil não encontrado" detail="Esta pessoa pode ter alterado o @username." />
    : <div className="profile-error"><strong>Não foi possível carregar seu perfil.</strong><Button onClick={() => void refresh()}>Tentar novamente</Button></div>;

  const profile = viewedProfile;
  const isOwn = profile.id === ownProfile?.id;
  const request = friendRequests.find((item) => item.profile.id === profile.id);
  const relation = isOwn ? "SELF" : friends.some((item) => item.id === profile.id) ? "FRIENDS" : request?.direction === "SENT" ? "SENT" : request?.direction === "RECEIVED" ? "RECEIVED" : "NONE";
  const profileGroups = groups.filter((group) => group.members.some((member) => member.userId === profile.id && member.status === "ACTIVE"));
  const pendingRequests = friendRequests.filter((item) => item.direction === "RECEIVED").length;
  const unreadConversations = conversations.reduce((total, item) => total + item.unreadCount, 0);
  const since = profile.createdAt ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(profile.createdAt)) : "";
  const typeLabel: Record<string, string> = { TRIP: "Viagem", EVENT: "Evento", HOUSE: "Casa", GIFT: "Presente", COUPLE: "Casal", GOAL: "Meta", OTHER: "Grupo" };
  const initialDraft = { displayName: ownProfile?.displayName ?? "", username: ownProfile?.username ?? "", bio: ownProfile?.bio ?? "" };
  const dirty = draft.displayName !== initialDraft.displayName || draft.username !== initialDraft.username || draft.bio !== initialDraft.bio || Boolean(avatarFile || coverFile || avatarRemoved || coverRemoved);
  const shownAvatar = avatarRemoved ? undefined : avatarPreview || profile.avatarUrl;
  const shownCover = coverRemoved ? undefined : coverPreview || profile.coverUrl;

  const copy = async (kind: "username" | "email", value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(kind); window.setTimeout(() => setCopied(null), 1300); } catch { setCopied(null); }
  };
  const openEditor = (section: "avatar" | "cover" | "identity" = "identity") => {
    setInitialEditorSection(section);
    setDraft(initialDraft);
    setAvatarFile(null); setCoverFile(null); setAvatarRemoved(false); setCoverRemoved(false);
    setAvatarCrop(defaultCrop); setCoverCrop(defaultCrop); setSaveError(""); setEditing(true);
  };
  const resetEditor = () => {
    setEditing(false); setDiscardOpen(false); setAvatarFile(null); setCoverFile(null);
    setAvatarRemoved(false); setCoverRemoved(false); setSaveError("");
  };
  const requestClose = () => { if (dirty) setDiscardOpen(true); else resetEditor(); };
  const chooseImage = (kind: "avatar" | "cover", file: File | null) => {
    if (!file) return;
    const limit = kind === "avatar" ? 5 : 8;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setSaveError("Use uma imagem JPEG, PNG ou WebP estática."); return; }
    if (file.size > limit * 1024 * 1024) { setSaveError(`A imagem deve ter no máximo ${limit} MB.`); return; }
    setSaveError("");
    if (kind === "avatar") { setAvatarFile(file); setAvatarRemoved(false); setAvatarCrop(defaultCrop); }
    else { setCoverFile(file); setCoverRemoved(false); setCoverCrop(defaultCrop); }
  };
  const message = async () => { const conversation = await openDirectConversation(profile.id); navigate(`/social?tab=conversations&conversation=${conversation.id}`); };
  const backToCofrin = () => {
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof historyIndex === "number" && historyIndex > 0) navigate(-1);
    else navigate("/social", { replace: true });
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (checkingUsername || (availability && !availability.available)) return;
    setSaveError("");
    try {
      const updated = await saveProfileChanges({
        profile: draft,
        avatar: { file: avatarFile ?? undefined, remove: avatarRemoved && Boolean(ownProfile?.avatarUrl), crop: avatarCrop },
        cover: { file: coverFile ?? undefined, remove: coverRemoved && Boolean(ownProfile?.coverUrl), crop: coverCrop },
      });
      setViewedProfile(updated);
      resetEditor();
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Não foi possível salvar agora. Suas alterações continuam aqui.");
    }
  };

  return <div className="profile-page premium-profile-page">
    {!isOwn && <button className="back-link" onClick={backToCofrin}><ChevronLeft size={15} />Voltar</button>}
    {isOwn && <>
      <input ref={avatarInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { chooseImage("avatar", event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
      <input ref={coverInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { chooseImage("cover", event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
    </>}
    <Card className="profile-premium-hero">
      <ProfileCover src={profile.coverUrl} />
      {isOwn && <button className="cover-edit-control" onClick={() => openEditor("cover")} aria-label="Editar capa do perfil"><ImageIcon size={15} />Editar capa</button>}
      <div className="profile-hero-content">
        <div className="profile-avatar-shell">
          <Avatar profile={profile} size="large" />
          {isOwn && <button className="avatar-edit-control" onClick={() => openEditor("avatar")} aria-label="Editar foto de perfil"><Camera size={14} /></button>}
        </div>
        <div className="profile-identity">
          <h1>{profile.displayName}</h1>
          <button className="username-copy selectable" aria-label="Copiar nome de usuário" onClick={() => void copy("username", `@${profile.username}`)}>
            <span>@{profile.username}</span>{copied === "username" ? <Check size={14} /> : <Copy size={14} />}<em>{copied === "username" ? "Copiado" : ""}</em>
          </button>
          {profile.bio ? <p className="selectable">{profile.bio}</p> : isOwn ? <button className="profile-add-bio" onClick={() => openEditor("identity")}>Conte um pouco sobre você<span>Adicionar descrição</span></button> : null}
          {isOwn ? <div className="profile-summary">
            <button onClick={() => navigate("/social?tab=friends")}>{friends.length} amigo{friends.length === 1 ? "" : "s"}</button><i>·</i>
            <button onClick={() => navigate("/groups")}>{profileGroups.length} grupo{profileGroups.length === 1 ? "" : "s"}</button>
            {conversations.length > 0 && <><i>·</i><button onClick={() => navigate("/social?tab=conversations")}>{conversations.length} conversa{conversations.length === 1 ? "" : "s"}</button></>}
          </div> : <small className="public-profile-note">{profileGroups.length === 0 ? "Nenhum grupo em comum" : `${profileGroups.length} grupo${profileGroups.length === 1 ? "" : "s"} em comum`}{relation === "FRIENDS" ? " · Vocês são amigos" : ""}</small>}
        </div>
        <div className="profile-actions">{isOwn
          ? <Button onClick={() => openEditor("identity")}><Pencil size={16} />Editar perfil</Button>
          : relation === "NONE" ? <Button loading={pending.mutation} onClick={() => void sendFriendRequest(profile.id)}><UserPlus size={16} />Adicionar amigo</Button>
          : relation === "SENT" ? <Button variant="secondary" disabled>Solicitação enviada</Button>
          : relation === "RECEIVED" ? <><Button loading={pending.mutation} onClick={() => request && void acceptFriendRequest(request.id)}><Check size={16} />Aceitar</Button><Button variant="secondary" onClick={() => request && void declineFriendRequest(request.id)}>Recusar</Button></>
          : <><Button onClick={() => void message()}><MessageCircle size={16} />Mensagem</Button><Button variant="secondary" onClick={() => setRemoving(true)}>Amigos</Button></>}
        </div>
      </div>
    </Card>

    {isOwn && <>
      <div className="profile-detail-grid">
        <Card className="profile-detail-card"><p className="eyebrow">Sobre</p><h2>Sua presença</h2><div className="profile-detail-line"><span>No Cofrin desde</span><strong>{since}</strong></div><button className="profile-security-link" onClick={() => navigate("/settings?tab=security")}>Gerenciar segurança <ChevronRight size={15} /></button></Card>
        <Card className="profile-detail-card profile-social-card"><p className="eyebrow">Social</p><h2>Suas conexões</h2><button className="profile-social-row" onClick={() => navigate("/social?tab=friends")}><span>Amigos</span><strong>{friends.length}</strong><ChevronRight size={16} /></button>{pendingRequests > 0 ? <button className="profile-social-row" onClick={() => navigate("/social?tab=requests")}><span>Solicitações</span><strong>{pendingRequests}</strong><ChevronRight size={16} /></button> : <p className="profile-social-empty">Nenhuma solicitação pendente</p>}{unreadConversations > 0 ? <button className="profile-social-row" onClick={() => navigate("/social?tab=conversations")}><span>Conversas não lidas</span><strong>{unreadConversations}</strong><ChevronRight size={16} /></button> : conversations.length > 0 ? <button className="profile-social-row" onClick={() => navigate("/social?tab=conversations")}><span>Conversas</span><strong>{conversations.length}</strong><ChevronRight size={16} /></button> : null}</Card>
      </div>
      <section className="profile-groups-section"><div className="profile-section-title"><div><p className="eyebrow">Participação</p><h2>Grupos compartilhados</h2></div>{profileGroups.length > 3 && <button onClick={() => navigate("/groups")}>Ver todos os grupos <ChevronRight size={15} /></button>}</div>{profileGroups.length ? <Card className="profile-groups-list">{profileGroups.slice(0, 3).map((group) => <button key={group.id} className="profile-group-row" onClick={() => navigate(`/groups/${group.id}`)}><span className="profile-group-type">{typeLabel[group.type]}</span><span><strong>{group.name}</strong><small>{group.members.filter((member) => member.status === "ACTIVE").length} participantes</small></span><ChevronRight size={17} /></button>)}</Card> : <Card className="profile-groups-empty"><p>Você ainda não participa de nenhum planejamento compartilhado.</p><Button variant="secondary" onClick={() => navigate("/groups")}>Ver grupos</Button></Card>}</section>
      <Card className="profile-account"><div><p className="eyebrow">Conta</p><h2>Informações da conta</h2></div><div className="profile-account-grid"><div><span>E-mail</span><button className="selectable account-copy" onClick={() => profile.email && void copy("email", profile.email)}><Mail size={14} />{profile.email}{copied === "email" ? <Check size={13} /> : <Copy size={13} />}</button></div><div><span>Conta criada</span><strong>{since}</strong></div></div></Card>
    </>}

    <Drawer open={editing} onClose={requestClose}>
      <form className="premium-profile-form" onSubmit={save}>
        <div className="premium-drawer-header"><DrawerHeader eyebrow="Perfil" title="Editar perfil" description="Revise a prévia e salve tudo em uma única etapa." /></div>
        <div className="premium-drawer-body">
          <section className="profile-live-preview" aria-label="Prévia do perfil">
            <ProfileCover src={shownCover} preview={Boolean(coverPreview)} {...coverCrop} />
            <div className="profile-live-preview-info">
              <div className="profile-avatar-shell preview-avatar">{avatarPreview && !avatarRemoved ? <img className="profile-avatar large" src={avatarPreview} alt="Prévia do avatar" style={{ objectPosition: `${avatarCrop.positionX}% ${avatarCrop.positionY}%`, transform: `scale(${avatarCrop.zoom})` }} /> : <Avatar profile={{ displayName: draft.displayName || "Seu nome", avatarUrl: shownAvatar }} size="large" />}</div>
              <div><strong>{draft.displayName || "Seu nome"}</strong><small>@{draft.username.replace(/^@/, "").toLowerCase() || "username"}</small><p>{draft.bio || "Sua descrição aparecerá aqui."}</p></div>
            </div>
          </section>

          <FormSection title="Aparência" description="As imagens só serão enviadas quando você salvar as alterações.">
            <div className="profile-media-edit-grid">
              <article ref={avatarEditor} className={`profile-media-editor ${initialEditorSection === "avatar" ? "targeted" : ""}`}><div><span>Avatar</span><small>JPEG, PNG ou WebP · até 5 MB</small></div><div className="media-button-row"><Button type="button" variant="secondary" onClick={() => avatarInput.current?.click()}><Camera size={15} />Escolher foto</Button>{(ownProfile?.avatarUrl || avatarFile) && <button type="button" className="text-danger-action" onClick={() => { setAvatarFile(null); setAvatarRemoved(true); }}>Remover</button>}</div>{avatarFile && <CropControls src={avatarPreview} kind="avatar" value={avatarCrop} onChange={setAvatarCrop} />}</article>
              <article ref={coverEditor} className={`profile-media-editor ${initialEditorSection === "cover" ? "targeted" : ""}`}><div><span>Capa</span><small>Formato horizontal · até 8 MB</small></div><div className="media-button-row"><Button type="button" variant="secondary" onClick={() => coverInput.current?.click()}><ImageIcon size={15} />Escolher capa</Button>{(ownProfile?.coverUrl || coverFile) && <button type="button" className="text-danger-action" onClick={() => { setCoverFile(null); setCoverRemoved(true); }}>Remover</button>}</div>{coverFile && <CropControls src={coverPreview} kind="cover" value={coverCrop} onChange={setCoverCrop} />}</article>
            </div>
          </FormSection>
          <section ref={identityEditor}><FormSection title="Identidade"><div className="form-field"><label htmlFor="profile-name">Nome de exibição</label><input id="profile-name" value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} maxLength={80} required /></div></FormSection></section>
          <FormSection title="Identificador" description="Seu @ é único e pode ser usado para encontrar você."><div className="form-field"><label htmlFor="profile-username">@username</label><div className={`username-field ${availability?.available ? "valid" : availability && !availability.available ? "invalid" : ""}`}><span>@</span><input id="profile-username" value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value.replace(/^@+/, "").toLowerCase() })} maxLength={30} required /></div></div>{draft.username !== ownProfile?.username && <FormHint>{checkingUsername ? "Verificando..." : availability?.available ? "Disponível" : availability?.message}</FormHint>}</FormSection>
          <FormSection title="Sobre você"><div className="form-field"><label htmlFor="profile-bio">Bio</label><textarea id="profile-bio" maxLength={160} value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} /><FormHint>{draft.bio.length} / 160</FormHint></div></FormSection>
          {saveError && <p className="form-error" role="alert">{saveError}</p>}
        </div>
        <div className="premium-drawer-footer"><DrawerFooter onCancel={requestClose} submitLabel="Salvar alterações" loading={pending.mutation} disabled={checkingUsername || Boolean(availability && !availability.available)} /></div>
      </form>
    </Drawer>

    {discardOpen && <div className="confirm-backdrop" role="presentation" onMouseDown={() => setDiscardOpen(false)}><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="discard-title" onMouseDown={(event) => event.stopPropagation()}><h2 id="discard-title">Descartar alterações?</h2><p>As edições de texto e as imagens escolhidas ainda não foram salvas.</p><div><Button variant="secondary" onClick={() => setDiscardOpen(false)}>Continuar editando</Button><Button variant="danger" onClick={resetEditor}>Descartar</Button></div></section></div>}
    <Drawer open={removing} onClose={() => setRemoving(false)}><DrawerHeader eyebrow="Amizade" title={`Remover ${profile.displayName} dos amigos?`} description="Os grupos compartilhados existentes não serão apagados." /><Button className="budget-delete" variant="danger" loading={pending.mutation} onClick={async () => { await removeFriend(profile.id); setRemoving(false); navigate("/social"); }}>Confirmar remoção</Button></Drawer>
  </div>;
}

function CropControls({ value, onChange, src, kind }: { value: CropState; onChange: (value: CropState) => void; src: string; kind: "avatar" | "cover" }) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number; positionX: number; positionY: number } | null>(null);
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId || !frame.current) return;
    const bounds = frame.current.getBoundingClientRect();
    onChange({
      ...value,
      positionX: Math.max(0, Math.min(100, drag.current.positionX - ((event.clientX - drag.current.x) / bounds.width) * 100)),
      positionY: Math.max(0, Math.min(100, drag.current.positionY - ((event.clientY - drag.current.y) / bounds.height) * 100)),
    });
  };
  return <div className="crop-controls">
    <div
      ref={frame}
      className={`visual-crop-frame ${kind}`}
      onPointerDown={(event) => { drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, positionX: value.positionX, positionY: value.positionY }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={move}
      onPointerUp={(event) => { drag.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={() => { drag.current = null; }}
      role="img"
      aria-label={`Prévia do recorte da ${kind === "avatar" ? "foto" : "capa"}. Arraste para reposicionar.`}
    >
      <img src={src} alt="" draggable={false} style={{ objectPosition: `${value.positionX}% ${value.positionY}%`, transform: `scale(${value.zoom})` }} />
      <span aria-hidden="true" />
    </div>
    <small>Arraste a imagem para reposicionar.</small>
    <label><span><ZoomIn size={13} />Zoom</span><input type="range" min="1" max="3" step="0.05" value={value.zoom} onChange={(event) => onChange({ ...value, zoom: Number(event.target.value) })} /></label>
  </div>;
}

function ProfileSkeleton() { return <div className="profile-page profile-skeleton"><div className="profile-skeleton-hero"><Skeleton lines={4} /></div><div className="profile-detail-grid"><Skeleton lines={3} /><Skeleton lines={3} /></div><Skeleton lines={4} /></div>; }

export function SocialPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { friends, friendRequests, conversations, pending, searchPeople, sendFriendRequest, acceptFriendRequest, declineFriendRequest, cancelFriendRequest, openDirectConversation } = useAppData();
  const tab = (params.get("tab") ?? "friends") as "friends" | "requests" | "conversations";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(Profile & { relationship: "NONE" | "SENT" | "RECEIVED" | "FRIENDS" })[]>([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => { if (query.trim().length < 2) { setResults([]); setSearching(false); return; } const controller = new AbortController(); setSearching(true); const timeout = window.setTimeout(() => void searchPeople(query, controller.signal).then(setResults).catch((cause) => { if (!(cause instanceof DOMException && cause.name === "AbortError")) setResults([]); }).finally(() => { if (!controller.signal.aborted) setSearching(false); }), 280); return () => { window.clearTimeout(timeout); controller.abort(); }; }, [query, searchPeople]);
  const setTab = (value: typeof tab) => { const next = new URLSearchParams(params); next.set("tab", value); if (value !== "conversations") next.delete("conversation"); setParams(next); };
  const received = friendRequests.filter((item) => item.direction === "RECEIVED");
  return <div className="social-page"><PageHeader eyebrow="Conexões" title="Social" description="Encontre pessoas, mantenha seus contatos e converse." /><SegmentedControl value={tab} onChange={setTab} options={[{ value: "friends", label: "Amigos" }, { value: "requests", label: `Solicitações${received.length ? ` (${received.length})` : ""}`, tone: "gold" }, { value: "conversations", label: "Conversas" }]} />
    {tab === "friends" && <section className="social-section"><div className="people-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou @" /></div>{searching && <p className="muted-status">Buscando pessoas...</p>}{query.trim().length >= 2 && !searching && <div className="search-results">{results.length ? results.map((person) => <PersonResult key={person.id} profile={person} onSend={() => void sendFriendRequest(person.id)} onAccept={() => { const request = friendRequests.find((item) => item.profile.id === person.id); if (request) void acceptFriendRequest(request.id); }} />) : <EmptyState title="Ninguém encontrado" detail="Tente outro nome ou @username." />}</div>}<Card className="social-list"><div className="section-heading"><div><h2>Seus amigos</h2><p>{friends.length ? `${friends.length} pessoa${friends.length === 1 ? "" : "s"} para planejar junto.` : "Busque uma pessoa pelo @ para começar."}</p></div></div>{friends.length ? friends.map((person) => <PersonRow key={person.id} profile={person} action={<Button onClick={async (event) => { event.stopPropagation(); const conversation = await openDirectConversation(person.id); navigate(`/social?tab=conversations&conversation=${conversation.id}`); }}><MessageCircle size={15} />Mensagem</Button>} />) : <EmptyState title="Você ainda não adicionou ninguém" detail="Busque uma pessoa pelo @ para começar." />}</Card></section>}
    {tab === "requests" && <Card className="social-list">{friendRequests.length ? friendRequests.map((request) => <PersonRow key={request.id} profile={request.profile} detail={request.direction === "RECEIVED" ? "Quer adicionar você" : "Solicitação enviada"} action={request.direction === "RECEIVED" ? <div className="row-actions"><Button variant="secondary" onClick={(event) => { event.stopPropagation(); void declineFriendRequest(request.id); }}>Recusar</Button><Button loading={pending.mutation} onClick={(event) => { event.stopPropagation(); void acceptFriendRequest(request.id); }}>Aceitar</Button></div> : <Button variant="secondary" onClick={(event) => { event.stopPropagation(); void cancelFriendRequest(request.id); }}>Cancelar</Button>} />) : <EmptyState title="Nenhuma solicitação pendente" detail="Novos pedidos de amizade aparecerão aqui." />}</Card>}
    {tab === "conversations" && <ConversationLayout />}</div>;
}
function PersonResult({ profile, onSend, onAccept }: { profile: Profile & { relationship: "NONE" | "SENT" | "RECEIVED" | "FRIENDS" }; onSend: () => void; onAccept: () => void }) { const navigate = useNavigate(); return <div className="person-result" onClick={() => navigate(`/u/${profile.username}`)}><Avatar profile={profile} /><div><strong>{profile.displayName}</strong><small>@{profile.username}</small></div>{profile.relationship === "NONE" ? <Button onClick={(event) => { event.stopPropagation(); onSend(); }}>Adicionar</Button> : profile.relationship === "RECEIVED" ? <Button onClick={(event) => { event.stopPropagation(); onAccept(); }}>Aceitar</Button> : <Badge tone={profile.relationship === "FRIENDS" ? "green" : "neutral"}>{profile.relationship === "FRIENDS" ? "Amigos" : "Enviado"}</Badge>}</div>; }
function PersonRow({ profile, detail, action }: { profile: Profile; detail?: string; action: React.ReactNode }) { const navigate = useNavigate(); return <div className="person-row" onClick={() => navigate(`/u/${profile.username}`)}><Avatar profile={profile} /><div><strong>{profile.displayName}</strong><small>@{profile.username}{detail ? ` · ${detail}` : ""}</small></div>{action}</div>; }
function ConversationLayout() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { conversations, messageResources, getMessages, sendConversationMessage, markConversationRead, pending, profile, friends } = useAppData();
  const selectedId = params.get("conversation") ?? conversations[0]?.id;
  const selected = conversations.find((item) => item.id === selectedId);
  const messageResource = selectedId ? messageResources[selectedId] : undefined;
  const messages = messageResource?.items ?? [];
  const [text, setText] = useState("");
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!selectedId) return; void getMessages(selectedId).then(() => void markConversationRead(selectedId)).catch(() => undefined); }, [selectedId]);
  useEffect(() => { scroll.current?.scrollTo({ top: scroll.current.scrollHeight }); }, [messages]);
  const people = useMemo(() => new Map([profile, ...friends].filter(Boolean).map((item) => [item!.id, item!])), [profile, friends]);
  if (!conversations.length) return <EmptyState title="Nenhuma conversa ainda" detail="Envie uma mensagem para um amigo ou use a conversa de um grupo." />;
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!selected || !text.trim()) return; await sendConversationMessage(selected.id, text); setText(""); };
  return <div className={`conversation-layout ${selected ? "has-selection" : ""}`}>
    <aside className="conversation-list"><p className="eyebrow">Conversas</p>{conversations.map((conversation) => <button className={`conversation-list-item ${conversation.id === selectedId ? "active" : ""}`} key={conversation.id} onClick={() => { const next = new URLSearchParams(params); next.set("conversation", conversation.id); setParams(next); }}>{conversation.type === "GROUP" ? <span className="conversation-mini-avatar"><UsersRound size={16} /></span> : <UserAvatar className="conversation-mini-avatar" src={conversation.avatarUrl} name={conversation.title} />}<span><strong>{conversation.title}</strong><small>{conversation.lastMessage ? `${conversation.lastMessage.senderId === profile?.id ? "Você: " : ""}${conversation.lastMessage.content}` : "Conversa iniciada"}</small></span>{conversation.unreadCount > 0 && <i>{conversation.unreadCount}</i>}</button>)}</aside>
    {selected && <section className="conversation-panel">
      <button className="conversation-back" onClick={() => { const next = new URLSearchParams(params); next.delete("conversation"); setParams(next); }}><ChevronLeft size={16} />Conversas</button>
      <button className="conversation-header" onClick={() => navigate(selected.type === "GROUP" ? `/groups/${selected.groupId}` : `/u/${people.get(selected.avatarUserId ?? "")?.username ?? ""}`)}>{selected.type === "GROUP" ? <span className="conversation-mini-avatar"><UsersRound size={17} /></span> : <UserAvatar className="conversation-mini-avatar" src={selected.avatarUrl} name={selected.title} />}<span><strong>{selected.title}</strong><small>{selected.subtitle}</small></span><ChevronRight size={16} /></button>
      <div className="messages" ref={scroll}>{messageResource?.status === "loading" && !messages.length ? <p className="muted-status">Carregando mensagens...</p> : messageResource?.status === "error" && !messages.length ? <div className="message-error" role="alert"><p>{messageResource.error}</p><Button variant="secondary" onClick={() => selectedId && void getMessages(selectedId)}>Tentar novamente</Button></div> : messages.length ? messages.map((message, index) => { const own = message.senderId === profile?.id; const sender = people.get(message.senderId); const previous = messages[index - 1]; const showName = !own && previous?.senderId !== message.senderId; return <div className={`message ${own ? "own" : ""}`} key={message.id}>{showName && <small>{sender?.displayName ?? "Participante"}</small>}<p>{message.content}</p><time>{new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.createdAt))}</time></div>; }) : <EmptyState title="Ainda não há mensagens" detail="Diga oi para iniciar a conversa." />}</div>
      <form className="message-composer" onSubmit={(event) => void submit(event)}><textarea value={text} maxLength={2000} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); (event.currentTarget.form as HTMLFormElement)?.requestSubmit(); } }} placeholder="Escreva uma mensagem..." /><Button type="submit" loading={pending.mutation} disabled={!text.trim()} aria-label="Enviar"><Send size={16} /></Button></form>
    </section>}
  </div>;
}
export function GroupConversationPanel({ groupId }: { groupId: string }) {
  const { getGroupConversation, getMessages, messageResources, sendConversationMessage, pending, profile } = useAppData();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [text, setText] = useState("");
  useEffect(() => { void getGroupConversation(groupId).then((conversation) => { setConversationId(conversation.id); return getMessages(conversation.id); }).catch(() => undefined); }, [groupId]);
  if (!conversationId) return <p className="muted-status">Preparando conversa...</p>;
  const resource = messageResources[conversationId];
  const messages = resource?.items ?? [];
  return <div className="group-conversation"><div className="messages">{resource?.status === "error" && !messages.length ? <div className="message-error" role="alert"><p>{resource.error}</p><Button variant="secondary" onClick={() => void getMessages(conversationId)}>Tentar novamente</Button></div> : messages.length ? messages.map((message) => <div className={`message ${message.senderId === profile?.id ? "own" : ""}`} key={message.id}><p>{message.content}</p><time>{new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.createdAt))}</time></div>) : <EmptyState title="Ainda não há mensagens" detail="Inicie a conversa sobre o planejamento." />}</div><form className="message-composer" onSubmit={async (event) => { event.preventDefault(); if (!text.trim()) return; await sendConversationMessage(conversationId, text); setText(""); }}><textarea value={text} maxLength={2000} onChange={(event) => setText(event.target.value)} placeholder="Escreva para o grupo..." /><Button type="submit" loading={pending.mutation} disabled={!text.trim()}><Send size={16} />Enviar</Button></form></div>;
}
