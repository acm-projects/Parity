import { useEffect, useRef, useState } from "react";
import PillButton from "../components/PillButton";
import { usePersistentState } from "../hooks/usePersistentState";
import {
  commitPlan,
  listFiles,
  listRepos,
  planCommit,
  type CommitFix,
  type Committed,
  type Plan,
  type Repo,
} from "../lib/api";
import { getAuth } from "../lib/auth";
import { entryChoices } from "../lib/github";
import { inspectedPageUrl } from "../lib/livefix";

interface Props {
  fixes: CommitFix[];
  preferFile?: string; // a file to suggest first, e.g. the Saltmeadow stylesheet
  onBack: () => void;
  onCommitted: () => void;
}

const card = "rounded-2xl bg-[var(--card)] p-4 shadow-[0_6px_18px_rgba(91,51,200,.10)]";
const field =
  "mt-1 w-full rounded-lg border-[1.5px] border-[var(--field-border)] bg-[var(--field)] px-3 py-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--p1)]";

const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export default function CommitSheet({ fixes, preferFile, onBack, onCommitted }: Props) {
  const [saved, setSaved, savedReady] = usePersistentState<{ repo: string; entry: string }>("parity-commit-target", {
    repo: "",
    entry: "",
  });
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [repoKey, setRepoKey] = useState("");
  const [files, setFiles] = useState<string[] | null>(null);
  const [entry, setEntry] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [done, setDone] = useState<Committed | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const savedEntry = useRef("");
  useEffect(() => {
    savedEntry.current = saved.entry;
  }, [saved.entry]);

  const repo = repos?.find((r) => `${r.owner}/${r.name}` === repoKey) ?? null;
  const hasGithub = !!getAuth()?.github;

  // 1. Repositories the user can push to.
  useEffect(() => {
    if (!hasGithub) return;
    listRepos().then(
      (all) => setRepos(all.filter((r) => r.canPush)),
      (e: unknown) => setError(message(e))
    );
  }, [hasGithub]);

  // 2. Preselect the repository used last time.
  useEffect(() => {
    if (!repos || !savedReady || repoKey) return;
    if (repos.some((r) => `${r.owner}/${r.name}` === saved.repo)) setRepoKey(saved.repo);
  }, [repos, savedReady, saved.repo, repoKey]);

  // 3. Files of the chosen repository, so the user can say which one starts the app.
  useEffect(() => {
    if (!repo) return;
    setFiles(null);
    setEntry("");
    setError("");
    listFiles(repo.owner, repo.name, repo.defaultBranch).then(
      (res) => {
        const list = entryChoices(res.files, preferFile);
        setFiles(list);
        const first = preferFile && list.includes(preferFile) ? preferFile : "";
        setEntry(first || (list.includes(savedEntry.current) ? savedEntry.current : (list[0] ?? "")));
      },
      (e: unknown) => setError(message(e))
    );
  }, [repo, preferFile]);

  const review = async () => {
    if (!repo || !entry) return;
    setBusy("Preparing your changes…");
    setError("");
    try {
      const websiteUrl = await inspectedPageUrl();
      if (!/^https?:\/\//.test(websiteUrl)) {
        throw new Error("Open the page you are inspecting over http or https, then try again.");
      }
      setPlan(
        await planCommit({
          owner: repo.owner,
          repo: repo.name,
          branch: repo.defaultBranch,
          entryFile: entry,
          websiteUrl,
          fixes,
        })
      );
      setSaved({ repo: repoKey, entry });
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy("");
    }
  };

  const commit = async () => {
    if (!plan) return;
    setBusy("Creating the branch…");
    setError("");
    try {
      setDone(await commitPlan(plan.id));
      onCommitted();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-3">
      <section className={card}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--ink)]">
            Commit {fixes.length} fix{fixes.length === 1 ? "" : "es"} to GitHub
          </h2>
          {!done && (
            <button
              type="button"
              onClick={plan ? () => setPlan(null) : onBack}
              className="cursor-pointer text-[11px] font-semibold text-[var(--p1)]"
            >
              &#8249; {plan ? "Change repo" : "Back to scores"}
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Parity puts your changes on a new branch. Nothing touches your main branch.
        </p>
        <ul className="mt-2 space-y-0.5">
          {fixes.map((f) => (
            <li key={f.id} className="break-words font-mono text-[10px] text-[var(--ink2)]">
              {f.selector} {"{"} {f.property}: {f.value} {"}"}
            </li>
          ))}
        </ul>
      </section>

      {!hasGithub && (
        <section className={card} role="alert">
          <p className="text-xs text-[var(--err)]">
            Parity doesn’t have access to your GitHub repositories yet. Sign out from the profile menu and sign in again
            to allow it.
          </p>
        </section>
      )}

      {hasGithub && done && (
        <section className={card}>
          <h3 className="text-sm font-semibold text-[var(--ink)]">Committed ✓</h3>
          <p className="mt-1 break-words text-xs text-[var(--ink2)]">
            Your changes are on the new branch <b>{done.branch}</b>. Open a pull request from it when you are ready.
          </p>
          <div className="mt-3 flex gap-2">
            <a
              href={done.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[linear-gradient(180deg,#6F47DB,#5A32C6)] px-2.5 py-0.5 text-xs font-semibold text-white"
            >
              View on GitHub
            </a>
            <PillButton variant="ghost" onClick={onBack}>
              Back to scores
            </PillButton>
          </div>
        </section>
      )}

      {hasGithub && !done && !plan && (
        <section className={card}>
          <label className="block text-[11px] font-bold text-[var(--ink)]" htmlFor="repo">
            Repository
          </label>
          <select
            id="repo"
            className={field}
            value={repoKey}
            disabled={!repos}
            onChange={(e) => setRepoKey(e.target.value)}
          >
            <option value="">{repos ? "Choose a repository…" : "Loading your repositories…"}</option>
            {repos?.map((r) => (
              <option key={`${r.owner}/${r.name}`} value={`${r.owner}/${r.name}`}>
                {r.owner}/{r.name}
              </option>
            ))}
          </select>
          {repos && repos.length === 0 && (
            <p className="mt-1 text-[11px] text-[var(--muted)]">No repositories with push access were found.</p>
          )}

          {repo && (
            <>
              <label className="mt-3 block text-[11px] font-bold text-[var(--ink)]" htmlFor="entry">
                {entry.endsWith(".css") ? "Stylesheet to fix" : "File that starts your app"}
              </label>
              <select
                id="entry"
                className={field}
                value={entry}
                disabled={!files}
                onChange={(e) => setEntry(e.target.value)}
              >
                {!files && <option value="">Loading files…</option>}
                {files?.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {entry.endsWith(".css")
                  ? "Parity edits this stylesheet: it deletes the lines that drift from Figma."
                  : "Parity adds one new CSS file and imports it here."}{" "}
                The new branch starts from <b>{repo.defaultBranch}</b>.
              </p>
            </>
          )}

          <PillButton onClick={review} disabled={!repo || !entry || !!busy} className="mt-3 disabled:opacity-60">
            {busy || "Review changes"}
          </PillButton>
        </section>
      )}

      {hasGithub && !done && plan && (
        <section className={card}>
          <h3 className="text-sm font-semibold text-[var(--ink)]">Review before committing</h3>
          <ul className="mt-2 space-y-1 text-[11px] text-[var(--ink2)]">
            {plan.files.map((f) => (
              <li key={f.path} className="break-words">
                <b>{f.path}</b> — {f.note ?? (f.before === null ? "new file" : "adds one import line")}
              </li>
            ))}
          </ul>
          <pre className="scroll mt-2 max-h-32 overflow-auto rounded-lg bg-[var(--card-tint)] p-2 text-[10px] text-[var(--ink2)]">
            {plan.css}
          </pre>
          <p className="mt-2 text-[10px] text-[var(--muted)]">{plan.warning}</p>
          <PillButton onClick={commit} disabled={!!busy} className="mt-3 disabled:opacity-60">
            {busy || "Create branch & commit"}
          </PillButton>
        </section>
      )}

      {error && (
        <p role="alert" className="px-1 text-[11px] font-semibold text-[var(--err)]">
          {error}
        </p>
      )}
    </div>
  );
}
