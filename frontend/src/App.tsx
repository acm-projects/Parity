import { useEffect, useState } from "react";
import { TABS, type Screen, type Session, type TabId, type Theme } from "./global";
import { usePersistentState } from "./hooks/usePersistentState";
import { useSelectedElement } from "./hooks/useSelectedElement";
import { parseFigma, loadFigmaFile } from "./lib/figma";
import { initialsOf } from "./lib/github";
import { LIVE } from "./lib/config";
import { endSession, onAuthChange, signInWithGitHub, syncAuth } from "./lib/auth";
import { ApiError, connectProject, getProject, me as getMe, refreshProject, selectFrame, type Project } from "./lib/api";
import type { ElementSnapshot } from "./lib/inspect";
import LandingPage from "./components/LandingPage";
import ConnectionStatus from "./components/ConnectionStatus";
import ProfileMenu from "./components/ProfileMenu";
import TabBar from "./components/TabBar";
import GithubLogin from "./pages/GithubLogin";
import GithubAuth from "./pages/GithubAuth";
import Connecting from "./pages/Connecting";
import FigmaLink from "./pages/FigmaLink";
import DesignComparison from "./pages/DesignComparison";
import AccessibilityScore from "./pages/AccessibilityScore";
import ComponentDetail from "./pages/ComponentDetail";
import ElementScore, { type ScoreMode } from "./pages/ElementScore";
import Account from "./pages/Account";
import mark from "./assets/mark.png";

const EMPTY: Session = { user: "", file: "", url: "", auth: null, projectId: null };

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export default function App() {
  const [session, setSession, ready] = usePersistentState<Session>("parity-session", EMPTY);
  const [theme, setTheme, themeReady] = usePersistentState<Theme>("parity-theme", "light");
  const [screen, setScreen] = useState<Screen>("landing");
  const [tab, setTab] = useState<TabId>("figma");
  const [detail, setDetail] = useState<string | null>(null); // a Part id, e.g. "fonts"
  const [account, setAccount] = useState(false); // true = the Settings page is showing
  const [element, setElement] = useState<ElementSnapshot | null>(null); // selected on the website
  const [pickId, setPickId] = useState(0); // changes with every pick, so each selection starts fresh
  const [figmaError, setFigmaError] = useState(false);
  const [figmaMsg, setFigmaMsg] = useState(""); // why the connection failed, when the server said
  const [project, setProject] = useState<Project | null>(null); // the connected Figma file (live mode)
  const [frameBusy, setFrameBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [after, setAfter] = useState<TabId>("design"); // tab to open once the file has loaded
  const [loaded, setLoaded] = useState(false); // Figma data finished loading
  const [booted, setBooted] = useState(false);

  // An element was selected with the inspect tool: show its scores on the Design or Accessibility tab.
  const inDevtools = useSelectedElement((snap) => {
    if (screen !== "app") return;
    setElement(snap);
    setPickId((n) => n + 1);
    setAccount(false);
    setDetail(null);
    setTab((t) => (t === "figma" ? "design" : t));
  });

  // Apply the theme to <html> so index.css can switch its colors.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // A refreshed GitHub sign-in has to be saved, or the next visit would use an expired one.
  useEffect(() => onAuthChange((auth) => setSession((s) => ({ ...s, auth }))), [setSession]);

  const signOut = () => {
    const logout = endSession();
    setAuthError("");
    setAuthBusy(true);
    setSession(EMPTY); // the theme is saved separately, so it survives sign out
    setProject(null);
    setScreen("landing");
    setTab("figma");
    setDetail(null);
    setAccount(false);
    setElement(null);
    void logout.catch(() => {
      setAuthError("Signed out on this device. Parity could not confirm sign-out with the server.");
    }).finally(() => setAuthBusy(false));
  };

  // Returning users skip the landing page. Runs once, after the saved session has loaded.
  useEffect(() => {
    if (!ready || booted) return;
    setBooted(true);
    // With the real backend, a saved name without a saved sign-in (demo mode before) means signed out.
    if (!session.user || (LIVE && !session.auth)) return;
    syncAuth(session.auth ?? null);
    setScreen("app");
    setTab(session.file ? "design" : "figma");
    if (LIVE && session.projectId) {
      getProject(session.projectId).then(setProject, (e: unknown) => {
        if (e instanceof ApiError && e.status === 401) signOut();
        else if (e instanceof ApiError && e.status === 404) setSession((s) => ({ ...s, projectId: null, file: "" }));
      });
    }
  }, [ready, booted, session]);

  const goTab = (t: TabId) => {
    setTab(t);
    setDetail(null);
    setAccount(false);
    setElement(null);
    setFigmaError(false);
    setFigmaMsg("");
  };

  // With an element selected, Design/Accessibility switch views but keep the element.
  const pickTab = (t: TabId) => {
    if (element && t !== "figma") {
      setTab(t);
      setAccount(false);
      return;
    }
    goTab(t);
  };

  // Demo mode: the made-up GitHub screens.
  const signIn = (user: string) => {
    setSession((s) => ({ ...s, user }));
    setScreen("githubAuth");
  };

  // Real mode: GitHub's own sign-in window, through Supabase.
  const signInLive = async () => {
    setAuthBusy(true);
    setAuthError("");
    try {
      const auth = await signInWithGitHub();
      syncAuth(auth);
      const who = await getMe();
      const user = who.username || who.email?.split("@")[0] || "github-user";
      setSession({ user, file: "", url: "", auth, projectId: null });
      setProject(null);
      setScreen("app");
      goTab("figma");
    } catch (e) {
      syncAuth(null);
      setAuthError(errorText(e));
    } finally {
      setAuthBusy(false);
    }
  };

  const connect = async (url: string) => {
    const ref = parseFigma(url);
    setSession((s) => ({ ...s, url }));
    setFigmaMsg("");
    if (!ref) {
      setFigmaError(true);
      return;
    }
    setFigmaError(false);
    setSession((s) => ({ ...s, url, file: ref.name }));
    setLoaded(false);
    setScreen("connecting");
    try {
      if (LIVE) {
        const p = await connectProject(url);
        setProject(p);
        setSession((s) => ({ ...s, file: p.file_name || ref.name, projectId: p.id }));
        // A link with ?node-id=... (or an earlier choice) already knows its frame. Otherwise pick one.
        setAfter(p.selected_frame_id ? "design" : "figma");
      } else {
        await loadFigmaFile(ref.key);
        setAfter("design");
      }
      setLoaded(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return signOut();
      setScreen("app");
      setTab("figma");
      setFigmaError(true);
      setFigmaMsg(errorText(e));
    }
  };

  const pickFrame = async (frameId: string) => {
    if (!project) return;
    setFrameBusy(true);
    try {
      setProject(await selectFrame(project.id, frameId));
      goTab("design");
    } catch (e) {
      setFigmaError(true);
      setFigmaMsg(errorText(e));
    } finally {
      setFrameBusy(false);
    }
  };

  const syncProject = async () => {
    if (!project) return;
    setFrameBusy(true);
    try {
      setProject(await refreshProject(project.id));
    } catch (e) {
      setFigmaError(true);
      setFigmaMsg(errorText(e));
    } finally {
      setFrameBusy(false);
    }
  };

  // How the element scores get their Figma numbers.
  const mode: ScoreMode = !LIVE
    ? { kind: "sample" }
    : project?.selected_frame_id
      ? { kind: "live", projectId: project.id, frame: project.selected_frame_name || "your frame" }
      : { kind: "needsFigma" };

  if (!ready || !themeReady) return null; // wait for saved state so nothing flashes

  if (screen === "landing") {
    return (
      <LandingPage
        onGithub={LIVE ? signInLive : () => setScreen("githubLogin")}
        showAccountSwitch={LIVE}
        busy={authBusy}
        error={authError}
      />
    );
  }
  if (screen === "githubLogin") {
    return <GithubLogin onBack={() => setScreen("landing")} onSubmit={signIn} />;
  }
  if (screen === "githubAuth") {
    return (
      <GithubAuth
        user={session.user}
        onAuthorize={() => {
          setScreen("app");
          goTab("figma");
        }}
        onCancel={() => setScreen("landing")}
      />
    );
  }
  if (screen === "connecting") {
    return (
      <Connecting
        ready={loaded}
        onDone={() => {
          setScreen("app");
          goTab(after);
        }}
        onCancel={() => {
          setScreen("app");
          goTab("figma");
        }}
      />
    );
  }

  return (
    <div className="parity-bg parity-dashboard">
      <div className="parity-inner mx-auto w-full max-w-[560px] space-y-3 p-4">
        <header className="grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-2">
          <img
            src={mark}
            alt="Parity"
            className="h-8 w-8 rounded-lg object-contain dark:bg-[#ECE7FF] dark:p-1"
          />
          <div className="flex justify-center">
            <ConnectionStatus file={session.file} />
          </div>
          <ProfileMenu
            initials={initialsOf(session.user)}
            name={session.user}
            theme={theme}
            onTheme={setTheme}
            onSettings={() => {
              setAccount(true);
              setDetail(null);
              setElement(null);
            }}
            onSignOut={signOut}
          />
        </header>

        <TabBar tabs={TABS} active={account ? null : tab} onChange={pickTab} />

        {/* Tells you how to select an element. Hidden once one is selected. */}
        {inDevtools && !account && !element && tab !== "figma" && (
          <p className="px-1 text-[11px] text-[var(--muted)]">
            Select an element on the page with Chrome’s inspect tool (the arrow icon at the top left of DevTools),
            then come back to this tab to see its scores.
          </p>
        )}

        {account ? (
          <Account
            user={session.user}
            file={session.file}
            theme={theme}
            onTheme={setTheme}
            onSignOut={signOut}
          />
        ) : element ? (
          <ElementScore
            key={pickId}
            el={element}
            tab={tab === "accessibility" ? "accessibility" : "design"}
            mode={mode}
            onBack={() => setElement(null)}
            onFigma={() => goTab("figma")}
          />
        ) : tab === "figma" ? (
          <FigmaLink
            url={session.url}
            error={figmaError}
            message={figmaMsg}
            project={project}
            busy={frameBusy}
            onConnect={connect}
            onOpen={connect}
            onPickFrame={pickFrame}
            onSync={syncProject}
          />
        ) : detail ? (
          <ComponentDetail report={tab} partId={detail} onBack={() => setDetail(null)} />
        ) : tab === "design" ? (
          <DesignComparison onSelect={setDetail} />
        ) : (
          <AccessibilityScore onSelect={setDetail} />
        )}
      </div>
    </div>
  );
}