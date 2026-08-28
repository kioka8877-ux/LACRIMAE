// Design philosophy: Salon Noir V2 — rounded, fluid, and separated into Organization and Welcome spaces.

import { useEffect, useMemo, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ClipboardList,
  Download,
  FileText,
  LayoutDashboard,
  Menu,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  X,
  Camera,
  UserCheck,
  Building2
} from "lucide-react";
import { SeatRoomControl } from "@/components/SeatRoomControl";

type ViewMode = "organisation" | "accueil";
type GuestStatus = "Présent" | "En attente" | "À vérifier";

type Guest = {
  id: string;
  name: string;
  phone: string;
  table: string;
  status: GuestStatus;
  time?: string;
};

const guests: Guest[] = [
  { id: "8f2", name: "Amélie Laurent", phone: "+33 6 18 42 90 31", table: "Table 03", status: "Présent", time: "19:03" },
  { id: "91c", name: "Thomas Delorme", phone: "+33 6 52 11 08 72", table: "Table 07", status: "Présent", time: "19:01" },
  { id: "b41", name: "Sofia Bernard", phone: "+33 6 77 03 56 18", table: "VIP A", status: "Présent", time: "18:59" },
  { id: "c22", name: "Nicolas Morel", phone: "+33 6 09 27 44 63", table: "Table 12", status: "En attente" },
  { id: "d18", name: "Clara Rousseau", phone: "+33 6 40 81 77 05", table: "Table 04", status: "En attente" },
  { id: "e73", name: "Julien Armand", phone: "+33 6 13 60 24 88", table: "Table 09", status: "À vérifier" },
];

function StatusPill({ status }: { status: GuestStatus }) {
  const styles: Record<GuestStatus, string> = {
    Présent: "status-pill status-pill--success",
    "En attente": "status-pill status-pill--muted",
    "À vérifier": "status-pill status-pill--warning",
  };
  return <span className={styles[status]}>{status}</span>;
}

function Avatar({ name, size = "md" }: { name: string, size?: "sm" | "md" }) {
  const initials = name.split(" ").map(n => n[0]).join("");
  const sizeClass = size === "sm" ? "avatar--sm" : "avatar--md";
  return <span className={`avatar ${sizeClass}`}>{initials}</span>;
}

function OrganizationDashboard({ onNavigate, eventId, userName }: { onNavigate: (v: string) => void; eventId: string; userName: string }) {
  const statsQuery = trpc.seatroom.stats.useQuery({ eventId });
  const guestsQuery = trpc.seatroom.guests.useQuery({ eventId });
  const stats = statsQuery.data ?? { total: 0, present: 0, flagged: 0 };
  const rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  return (
    <div className="page-stack">
      <section className="welcome-row reveal">
        <div>
          <p className="eyebrow">ESPACE ORGANISATION</p>
          <h1>Bonsoir, <em>{userName.split(" ")[0]}.</em></h1>
        </div>
      </section>

      <section className="metric-grid reveal reveal-delay-1">
        <article className="metric-card metric-card--accent">
          <span className="metric-card__label">PRÉSENTS</span>
          <strong>{stats.present}</strong>
          <small>Sur {stats.total} invités</small>
          <div className="metric-progress"><i style={{ width: `${rate}%` }} /></div>
        </article>
        <article className="metric-card">
          <span className="metric-card__label">TAUX DE PRÉSENCE</span>
          <strong>{rate}%</strong>
          <small>Progression en direct</small>
        </article>
        <article className="metric-card">
          <span className="metric-card__label">EN ATTENTE</span>
          <strong>{stats.total - stats.present}</strong>
          <small>{100 - rate}% de la liste</small>
        </article>
        <article className="metric-card">
          <span className="metric-card__label">ANOMALIES</span>
          <strong className={stats.flagged > 0 ? "metric-number--warning" : ""}>{stats.flagged}</strong>
          <small>Signalements actifs</small>
        </article>
      </section>

      <section className="content-grid reveal reveal-delay-2">
        <div className="panel panel--activity">
          <div className="panel-heading">
            <div><span className="eyebrow">DERNIERS PASSAGES</span><h3>L’activité en direct</h3></div>
            <button className="text-button" onClick={() => onNavigate("Invités")}>Voir tout <ArrowUpRight size={14} /></button>
          </div>
          <div className="activity-list">
            {guestsQuery.data?.slice(0, 4).map((guest) => (
              <div className="activity-row" key={guest.id}>
                <Avatar name={`${guest.firstName} ${guest.lastName}`} size="sm" />
                <div className="activity-row__person"><strong>{guest.firstName} {guest.lastName}</strong><span>{guest.table}</span></div>
                <div className="activity-row__time"><StatusPill status={guest.status === "present" ? "Présent" : guest.status === "flagged" ? "À vérifier" : "En attente"} />{guest.checkInTime && <span>{new Date(guest.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}</div>
              </div>
            ))}
            {(!guestsQuery.data || guestsQuery.data.length === 0) && <p className="empty-hint">Aucun passage enregistré pour le moment.</p>}
          </div>
        </div>
        <div className="panel panel--photo">
          <img src="/manus-storage/gatsby-table-detail_305c20f9.jpg" alt="Détail de table" />
          <div className="photo-overlay">
            <span className="eyebrow">IMPORTATION</span>
            <h3>Liste d’invités</h3>
            <p>200 invités importés via invites.csv</p>
            <button className="icon-button" onClick={() => onNavigate("Importer")}><Upload size={17} /></button>
          </div>
        </div>
      </section>
    </div>
  );
}

function WelcomeSpace({ eventId }: { eventId: string }) {
  const [scanState, setScanState] = useState<"idle" | "scanning" | "success" | "duplicate" | "invalid">("idle");
  const [cameraRequested, setCameraRequested] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [guestInfo, setGuestInfo] = useState<{ name: string; table: string } | null>(null);
  const checkInMutation = trpc.seatroom.checkIn.useMutation();
  const statsQuery = trpc.seatroom.stats.useQuery({ eventId });
  const stats = statsQuery.data ?? { total: 0, present: 0 };

  useEffect(() => {
    if (!cameraRequested) return;
    const reader = new Html5Qrcode("seatroom-qr-reader");
    let active = true;
    reader.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 230, height: 230 } },
      async (decodedText) => {
        if (!active) return;
        active = false;
        try {
          const res = await checkInMutation.mutateAsync({ uuid: decodedText });
          setScanState(res.status);
          if (res.guest) setGuestInfo({ name: `${res.guest.firstName} ${res.guest.lastName}`, table: res.guest.table || "—" });
          void statsQuery.refetch();
        } catch {
          setScanState("invalid");
        }
        setCameraRequested(false);
        try { await reader.stop(); } catch { /* camera may already be stopping */ }
      },
      () => undefined,
    ).catch(() => {
      if (!active) return;
      setCameraError("La caméra n’a pas pu être activée. Vérifiez la permission du navigateur.");
      setCameraRequested(false);
      setScanState("idle");
    });
    return () => {
      active = false;
      void reader.stop().catch(() => undefined);
    };
  }, [cameraRequested]);

  const startCamera = () => { setCameraError(""); setScanState("scanning"); setCameraRequested(true); };
  const resetScan = () => { setCameraRequested(false); setCameraError(""); setGuestInfo(null); setScanState("idle"); };
  const result = scanState === "success" ? { title: "INVITATION VALIDE", tone: "success", name: guestInfo?.name || "Invité reconnu", table: guestInfo?.table || "—" } : scanState === "duplicate" ? { title: "DÉJÀ SCANNÉE", tone: "danger", name: guestInfo?.name || "Invitation déjà utilisée", table: "À vérifier" } : scanState === "invalid" ? { title: "CODE INVALIDE", tone: "danger", name: "Invitation inconnue", table: "—" } : null;

  return (
    <div className="welcome-space reveal">
      <section className="welcome-heading">
        <p className="eyebrow">ESPACE ACCUEIL</p>
        <h1>Prêt pour <em>le scan.</em></h1>
        <p className="lede">L’agent d’accueil vérifie chaque invitation avec précision.</p>
      </section>

      <div className={`scanner-card ${result ? `scanner-card--${result.tone}` : ""}`}>
        {scanState === "idle" ? (
          <div className="scanner-idle">
            <div className="scanner-idle__icon"><Camera size={40} /></div>
            <h3>Activer la caméra</h3>
            <p>SeatRoom demande l’autorisation d’accéder à l’appareil photo pour scanner les QR codes.</p>
            <button className="button button--gold button--large" onClick={startCamera}>
              Autoriser et scanner
            </button>
            {cameraError && <p className="camera-error" role="alert">{cameraError}</p>}
          </div>
        ) : (
          <div className="scanner-active">
            <div className="scan-viewfinder" id="seatroom-qr-reader">
              <div className="scan-corners" />
              {result ? (
                <div className="scan-result-overlay">
                  <div className={`scan-result-icon scan-result-icon--${result.tone}`}>
                    {result.tone === "success" ? <Check size={32} /> : <X size={32} />}
                  </div>
                  <span className="eyebrow">{result.title}</span>
                  <h2>{result.name}</h2>
                  <strong>{result.table}</strong>
                  <button className="button button--ghost" onClick={startCamera}>Scanner le suivant</button>
                </div>
              ) : (
                <div className="scan-active-hint">
                  <div className="scan-laser" />
                  <span>Visez le QR code</span>
                </div>
              )}
            </div>
            <div className="scanner-footer">
              <div className="scanner-stats">
                <span>145 / 200</span>
                <div className="scanner-progress"><i style={{ width: "72.5%" }} /></div>
              </div>
              <button className="text-button" onClick={resetScan}><Search size={14} /> Recherche manuelle</button>
            </div>
          </div>
        )}
      </div>

      <div className="scanner-test-controls">
        <p className="eyebrow">TESTER LES ÉTATS</p>
        <div className="button-group">
          <button onClick={() => { setCameraRequested(false); setScanState("success"); }}>Valide</button>
          <button onClick={() => { setCameraRequested(false); setScanState("duplicate"); }}>Doublon</button>
          <button onClick={() => { setCameraRequested(false); setScanState("invalid"); }}>Invalide</button>
          <button onClick={resetScan}>Reset</button>
        </div>
      </div>
    </div>
  );
}

function GuestsView({ eventId }: { eventId: string }) {
  const [query, setQuery] = useState("");
  const guestsQuery = trpc.seatroom.guests.useQuery({ eventId });
  const filtered = useMemo(() => (guestsQuery.data || []).filter((g) => `${g.firstName} ${g.lastName} ${g.phone} ${g.table}`.toLowerCase().includes(query.toLowerCase())), [query, guestsQuery.data]);
  return <div className="page-stack"><section className="page-heading"><div><p className="eyebrow">DONNÉES</p><h1>Les invités.</h1></div><button className="button button--gold"><Plus size={17} /> Ajouter</button></section><div className="toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, table ou téléphone" /></div><button className="button button--outline"><Download size={16} /> Exporter</button></div><div className="panel guest-table-wrap"><table className="guest-table"><thead><tr><th>INVITÉ</th><th>CONTACT</th><th>TABLE</th><th>STATUT</th></tr></thead><tbody>{filtered.map((g) => <tr key={g.id}><td><span className="guest-name-cell"><Avatar name={`${g.firstName} ${g.lastName}`} size="sm" /><strong>{g.firstName} {g.lastName}</strong></span></td><td className="muted-cell">{g.phone}</td><td className="gold-cell">{g.table}</td><td><StatusPill status={g.status === "present" ? "Présent" : g.status === "flagged" ? "À vérifier" : "En attente"} /></td></tr>)}</tbody></table></div></div>;
}

function NotificationsPanel() {
  return <div className="header-popover notifications-popover"><div className="popover-heading"><div><span className="eyebrow">CENTRE D’ACTIVITÉ</span><h3>Notifications</h3></div><span className="notification-count">3</span></div><div className="notification-item"><span className="notification-icon notification-icon--success"><Check size={14} /></span><div><strong>Amélie Laurent est arrivée</strong><span>Table 03 · il y a 2 min</span></div></div><div className="notification-item"><span className="notification-icon notification-icon--warning">!</span><div><strong>3 anomalies à vérifier</strong><span>Contrôle requis avant 20:00</span></div></div><div className="notification-item"><span className="notification-icon"><Upload size={14} /></span><div><strong>Liste importée avec succès</strong><span>200 invités · invites.csv</span></div></div><button className="text-button popover-link">Voir le journal complet <ArrowUpRight size={14} /></button></div>;
}

function ProfileMenu({ onCreateAccount, onLogout, userName }: { onCreateAccount: () => void; onLogout: () => void; userName: string }) {
  return <div className="header-popover profile-popover"><div className="profile-popover__identity"><Avatar name={userName} /><div><strong>{userName}</strong><span>Compte SeatRoom</span></div></div><button className="profile-menu-item" onClick={onCreateAccount}><UserCheck size={16} /><div><strong>Créer un accès</strong><span>Inviter un agent d’accueil</span></div></button><button className="profile-menu-item"><ShieldCheck size={16} /><div><strong>Mon profil</strong><span>Préférences et sécurité</span></div></button><button className="profile-menu-item profile-menu-item--muted" onClick={onLogout}><X size={16} /><div><strong>Se déconnecter</strong><span>Fermer la session</span></div></button></div>;
}

function AuthModal({ onClose, eventId }: { onClose: () => void; eventId: string }) {
  const [role, setRole] = useState<"organizer" | "agent">("agent");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const inviteMutation = trpc.seatroom.inviteAgent.useMutation({ onSuccess: () => setSent(true) });
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="auth-title"><div className="auth-modal"><button className="modal-close" onClick={onClose}><X size={18} /></button>{sent ? <div className="auth-success"><div className="auth-success__icon"><Check size={28} /></div><span className="eyebrow">INVITATION ENVOYÉE</span><h2>Accès préparé.</h2><p>L’invitation pour <strong>{email}</strong> est prête. La personne pourra se connecter avec son compte Google ou e-mail.</p><button className="button button--gold" onClick={onClose}>Fermer</button></div> : <><span className="eyebrow">NOUVEL ACCÈS</span><h2 id="auth-title">Inviter un membre.</h2><p className="auth-copy">Préparez l’accès pour un organisateur ou un agent d’accueil.</p><div className="role-switch"><button className={role === "organizer" ? "active" : ""} onClick={() => setRole("organizer")}><Building2 size={16} /><span><strong>Organisation</strong><small>Gérer l’événement</small></span></button><button className={role === "agent" ? "active" : ""} onClick={() => setRole("agent")}><UserCheck size={16} /><span><strong>Accueil</strong><small>Scanner les invités</small></span></button></div><label className="field-label" htmlFor="account-email">Adresse e-mail</label><input id="account-email" className="auth-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom@domaine.com" /><button className="button button--gold button--full" disabled={!email.includes("@") || inviteMutation.isPending} onClick={() => inviteMutation.mutate({ email, role, eventId })}>Envoyer l’invitation</button></>}</div ></div>;
}

function AccountGate({ onSignUp, onSignIn }: { onSignUp: () => void; onSignIn: () => void }) {
  return (
    <div className="account-gate">
      <div className="account-gate__mark"><Sparkles size={20} /></div>
      <span className="eyebrow">SEATROOM</span>
      <h1>Votre événement,<br /><em>maîtrisé.</em></h1>
      <p className="account-gate__desc">Créez votre événement ou rejoignez une équipe d'accueil.</p>
      <div className="button-stack">
        <button className="button button--gold button--large button--full" onClick={onSignUp}>
          <Building2 size={17} />
          <span>Créer mon événement</span>
          <ArrowUpRight size={16} />
        </button>
        <button className="button button--outline button--large button--full" onClick={onSignIn}>
          <UserCheck size={17} />
          <span>Je suis invité · Me connecter</span>
          <ArrowUpRight size={16} />
        </button>
      </div>
      <small className="account-gate__note">L'authentification se fait via le portail sécurisé (e-mail ou Google).</small>
    </div>
  );
}

function RoleSetup({ onSelect }: { onSelect: (role: "organizer") => void }) {
  return (
    <div className="account-gate">
      <div className="account-gate__mark"><Sparkles size={20} /></div>
      <span className="eyebrow">BIENVENUE DANS SEATROOM</span>
      <h1>Ouvrir l'espace<br /><em>Organisation.</em></h1>
      <p>Vous accédez au tableau de bord pour créer votre événement.</p>
      <button className="button button--gold button--large button--full" onClick={() => onSelect("organizer")}>
        <Building2 size={17} />
        <span>Accéder à l'Organisation</span>
        <ArrowUpRight size={16} />
      </button>
    </div>
  );
}

export default function Home() {
  const auth = useAuth();
  const [mode, setMode] = useState<ViewMode>("organisation");
  const [activeView, setActiveView] = useState("Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerPanel, setHeaderPanel] = useState<"notifications" | "profile" | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const profileQuery = trpc.seatroom.profile.useQuery(undefined, {
    enabled: auth.isAuthenticated,
    retry: false,
  });

  const claimMutation = trpc.seatroom.claimInvitation.useMutation({
    onSuccess: () => profileQuery.refetch(),
  });

  const setRoleMutation = trpc.seatroom.setRole.useMutation({
    onSuccess: () => profileQuery.refetch(),
  });

  useEffect(() => {
    if (auth.isAuthenticated && !profileQuery.isLoading && !profileQuery.data && !claimMutation.isPending && !claimMutation.isSuccess) {
      claimMutation.mutate();
    }
  }, [auth.isAuthenticated, profileQuery.data, profileQuery.isLoading, claimMutation]);

  const eventId = profileQuery.data?.eventId || "event-grand-bal";
  const statsQuery = trpc.seatroom.stats.useQuery(
    { eventId },
    { enabled: auth.isAuthenticated && !!profileQuery.data }
  );

  useEffect(() => {
    if (!auth.isAuthenticated || profileQuery.isLoading || profileQuery.data || setRoleMutation.isPending) return;
    const pendingRole = localStorage.getItem("seatroom-pending-role");
    if (pendingRole === "organizer" || pendingRole === "agent") {
      localStorage.removeItem("seatroom-pending-role");
      setRoleMutation.mutate({ role: pendingRole });
    }
  }, [auth.isAuthenticated, profileQuery.data, profileQuery.isLoading, setRoleMutation.isPending]);

  useEffect(() => {
    if (profileQuery.data?.seatRoomRole === "agent") setMode("accueil");
  }, [profileQuery.data?.seatRoomRole]);

  if (auth.loading) return <div className="auth-loading"><Sparkles size={20} /><span>Ouverture de SeatRoom…</span></div>;
  if (!auth.isAuthenticated) {
    const handleSignUp = () => {
      localStorage.setItem("seatroom-pending-role", "organizer");
      startLogin();
    };
    const handleSignIn = () => {
      localStorage.setItem("seatroom-pending-role", "agent");
      startLogin();
    };
    return <AccountGate onSignUp={handleSignUp} onSignIn={handleSignIn} />;
  }
  if (!profileQuery.isLoading && !profileQuery.data && !setRoleMutation.isPending) return <RoleSetup onSelect={(role) => setRoleMutation.mutate({ role })} />;

  const userName = auth.user?.name || auth.user?.email || "Utilisateur SeatRoom";
  const isAgent = profileQuery.data?.seatRoomRole === "agent";
  const stats = statsQuery.data ?? { total: 0, present: 0 };
  const rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  const renderContent = () => {
    if (mode === "accueil") return <WelcomeSpace eventId={eventId} />;
    if (activeView === "Invités") return <GuestsView eventId={eventId} />;
    if (activeView === "Importer") return <div className="page-stack"><h1>Import</h1><p>Espace de dépôt invites.csv</p></div>;
    return <OrganizationDashboard onNavigate={setActiveView} eventId={eventId} userName={userName} />;
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""} ${sidebarCollapsed ? "sidebar--collapsed" : ""}`}>
        <div className="sidebar-top">
          <div className="brand-mark">
            <img src="/manus-storage/gatsby-mark_ad54d564.png" alt="SeatRoom" />
            <span>SEATROOM</span>
          </div>
          <button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        </div>

        <div className="space-selector">
          {!isAgent && <button 
            className={`space-selector__btn ${mode === "organisation" ? "active" : ""}`}
            onClick={() => { setMode("organisation"); setActiveView("Dashboard"); setMobileOpen(false); }}
          >
            <Building2 size={16} /> Organisation
          </button>}
          <button 
            className={`space-selector__btn ${mode === "accueil" ? "active" : ""}`}
            onClick={() => { setMode("accueil"); setMobileOpen(false); }}
          >
            <UserCheck size={16} /> Accueil
          </button>
        </div>

        {mode === "organisation" && (
          <nav className="side-nav">
            <button className={`side-nav__item ${activeView === "Dashboard" ? "side-nav__item--active" : ""}`} onClick={() => setActiveView("Dashboard")}><LayoutDashboard size={17} /> Dashboard</button>
            <button className={`side-nav__item ${activeView === "Invités" ? "side-nav__item--active" : ""}`} onClick={() => setActiveView("Invités")}><Users size={17} /> Invités</button>
            <button className={`side-nav__item ${activeView === "Invitations" ? "side-nav__item--active" : ""}`} onClick={() => setActiveView("Invitations")}><FileText size={17} /> Invitations</button>
            <button className={`side-nav__item ${activeView === "Importer" ? "side-nav__item--active" : ""}`} onClick={() => setActiveView("Importer")}><Upload size={17} /> Importer</button>
          </nav>
        )}

        <div className="sidebar-bottom">
          <button className="side-nav__item"><ClipboardList size={17} /> Anomalies <span className="nav-badge">03</span></button>
          <div className="operator-card">
            <Avatar name={userName} />
            <div><strong>{userName}</strong><span>{isAgent ? "Agent" : "Organisateur"}</span></div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" aria-label={sidebarCollapsed ? "Développer le menu" : "Réduire le menu"} onClick={() => { if (window.innerWidth <= 640) { setMobileOpen(true); } else { setSidebarCollapsed(!sidebarCollapsed); } }}><Menu size={20} /></button>
            <SeatRoomControl eventName="Le Grand Bal — Édition I" onNavigate={setActiveView} stats={{ total: stats.total, present: stats.present, rate }} />
          </div>
          <div className="topbar-actions">
            <div className="popover-anchor"><button className="icon-button" aria-label="Ouvrir les notifications" onClick={() => setHeaderPanel(headerPanel === "notifications" ? null : "notifications")}><Bell size={17} /><span className="notification-dot" /></button>{headerPanel === "notifications" && <NotificationsPanel />}</div>
            <div className="popover-anchor"><button className="profile-trigger" aria-label="Ouvrir le menu du profil" onClick={() => setHeaderPanel(headerPanel === "profile" ? null : "profile")}><Avatar name={userName} size="sm" /></button>{headerPanel === "profile" && <ProfileMenu userName={userName} onCreateAccount={() => { setHeaderPanel(null); setShowAuth(true); }} onLogout={() => { setHeaderPanel(null); void auth.logout(); }} />}</div>
          </div>
        </header>

        {showAuth && <AuthModal onClose={() => setShowAuth(false)} eventId={eventId} />}

        <div className="content-wrap">
          {renderContent()}
        </div>

        <footer className="footer-note">
          <span><Sparkles size={13} /> SEATROOM · L’ÉLÉGANCE À CHAQUE ENTRÉE</span>
          <span>FLEET STATUS · <b>OPERATIONAL</b></span>
        </footer>
      </main>
    </div>
  );
}
