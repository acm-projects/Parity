import { useEffect, useState } from "react";
import { TABS, type Screen, type Session, type TabId, type Theme } from "./global";
import { usePersistentState } from "./hooks/usePersistentState";
import { useSelectedElement } from "./hooks/useSelectedElement";
import { parseFigma, loadFigmaFile } from "./lib/figma";
import { initialsOf } from "./lib/github";
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
import ElementScore from "./pages/ElementScore";
import Account from "./pages/Account";
import mark from "./assets/mark.png";

const EMPTY: Session = { user: "", file: "", url: "" };

export default function App() {
  const [session, setSession, ready] = usePersistentState<Session>("parity-session", EMPTY);
  const [theme, setTheme, themeReady] = usePersistentState<Theme>("parity-theme", "light");
  const [screen, setScreen] = useState<Screen>("landing");
  const [tab, setTab] = useState<TabId>("figma");
  const [detail, setDetail] = useState<string | null>(null); // a Part id, e.g. "fonts"
  const [account, setAccount] = useState(false); // true = the Settings page is showing
  const [element, setElement] = useState<ElementSnapshot | null>(null); // selected on the website
  const [figmaError, setFigmaError] = useState(false);
  const [loaded, setLoaded] = useState(false); // Figma data finished loading
  const [booted, setBooted] = useState(false);

  // An element was selected with the inspect tool: show its scores on the Design or Accessibility tab.
  const inDevtools = useSelectedElement((snap) => {
    if (screen !== "app") return;
    setElement(snap);
    setAccount(false);
    setDetail(null);
    setTab((t) => (t === "figma" ? "design" : t));
  });

  // Apply the theme to <html> so index.css can switch its colors.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Returning users skip the landing page. Runs once, after the saved session has loaded.
  useEffect(() => {
    if (!ready || booted) return;
    setBooted(true);
    if (session.user) {
      setScreen("app");
      setTab(session.file ? "design" : "figma");
    }
  }, [ready, booted, session]);

  const goTab = (t: TabId) => {
    setTab(t);
    setDetail(null);
    setAccount(false);
    setElement(null);
    setFigmaError(false);
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

  const signIn = (user: string) => {
    setSession((s) => ({ ...s, user }));
    setScreen("githubAuth");
  };

  const signOut = () => {
    setSession(EMPTY); // the theme is saved separately, so it survives sign out
    setScreen("landing");
    setTab("figma");
    setDetail(null);
    setAccount(false);
    setElement(null);
  };

  const connect = async (url: string) => {
    const ref = parseFigma(url);
    setSession((s) => ({ ...s, url }));
    if (!ref) {
      setFigmaError(true);
      return;
    }
    setFigmaError(false);
    setSession((s) => ({ ...s, url, file: ref.name }));
    setLoaded(false);
    setScreen("connecting");
    try {
      await loadFigmaFile(ref.key);
      setLoaded(true);
    } catch {
      setScreen("app");
      setTab("figma");
      setFigmaError(true);
    }
  };

  const openFile = (name: string) => {
    setSession((s) => ({ ...s, file: name }));
    goTab("design");
  };

  if (!ready || !themeReady) return null; // wait for saved state so nothing flashes

  if (screen === "landing") return <LandingPage onGithub={() => setScreen("githubLogin")} />;
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
          goTab("figma");
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
            key={element.selector}
            el={element}
            tab={tab === "accessibility" ? "accessibility" : "design"}
            onBack={() => setElement(null)}
          />
        ) : tab === "figma" ? (
          <FigmaLink url={session.url} error={figmaError} onConnect={connect} onOpen={openFile} />
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