import { usePersistentState } from '../hooks/usePersistentState';
import { initialsOf } from '../lib/github';
import ThemeSwitch from '../components/ThemeSwitch';
import type { Theme } from '../global';

const SETTINGS = [
  { id: 'auto', label: 'Auto-compare on save' },
  { id: 'notify', label: 'Notify me about new differences' },
  { id: 'a11y', label: 'Include accessibility checks' },
] as const;
type SettingId = (typeof SETTINGS)[number]['id'];

const card = 'rounded-2xl bg-[var(--card)] p-4 shadow-[0_6px_18px_rgba(91,51,200,.10)]';
const badge = 'rounded-full bg-[var(--badge-bg)] px-2 py-[3px] text-[11px] font-bold text-[var(--badge-text)]';

interface Props {
  user: string;
  file: string;
  theme: Theme;
  onTheme: (t: Theme) => void;
  onSignOut: () => void;
}

export default function Account({ user, file, theme, onTheme, onSignOut }: Props) {
  const [on, setOn] = usePersistentState<Record<SettingId, boolean>>('parity-settings', { auto: true, notify: true, a11y: true });

  return (
    <>
      <section className={card}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#7A52E8] to-[#4B2BB0] text-base font-extrabold text-white">{initialsOf(user) || '?'}</span>
          <div className="flex-1">
            <div className="text-base font-extrabold tracking-[-.01em]">@{user}</div>
            <div className="mt-0.5 text-[11px] text-[var(--muted)]">Signed in with GitHub &middot; Free plan</div>
          </div>
        </div>
      </section>

      <section className={card}>
        <h3 className="m-0 mb-0.5 text-sm font-extrabold">Connected accounts</h3>
        <div className="flex items-center gap-3 border-t border-[var(--line)] py-2">
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[9px] bg-[#1E1050] text-[11px] font-extrabold text-white">GH</span>
          <div className="min-w-0 flex-1"><div className="text-xs font-bold">GitHub</div><div className="truncate text-[11px] text-[var(--muted)]">@{user}</div></div>
          <span className={badge}>Connected</span>
        </div>
        <div className="flex items-center gap-3 border-t border-[var(--line)] py-2">
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[9px] bg-gradient-to-br from-[#7A52E8] to-[#EFB87A] text-[11px] font-extrabold text-white">Fg</span>
          <div className="min-w-0 flex-1"><div className="text-xs font-bold">Figma</div><div className="truncate text-[11px] text-[var(--muted)]">{file || 'No file yet'}</div></div>
          {file && <span className={badge}>Connected</span>}
        </div>
      </section>

      <section className={card}>
        <h3 className="m-0 mb-0.5 text-sm font-extrabold">Settings</h3>

        <div className="flex items-center justify-between border-t border-[var(--line)] py-[7px] text-xs font-semibold">
          <span>Appearance</span>
          <ThemeSwitch theme={theme} onChange={onTheme} />
        </div>

        {SETTINGS.map((s) => (
          <button key={s.id} type="button" role="switch" aria-checked={on[s.id]}
            onClick={() => setOn((v) => ({ ...v, [s.id]: !v[s.id] }))}
            className="flex w-full items-center justify-between border-t border-[var(--line)] py-[9px] text-left text-xs font-semibold">
            <span>{s.label}</span>
            <span className={`relative inline-block h-5 w-[34px] flex-none rounded-full transition-colors ${on[s.id] ? 'bg-[var(--fill)]' : 'bg-[var(--switch-off)]'}`}>
              <i className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on[s.id] ? 'left-4' : 'left-0.5'}`} />
            </span>
          </button>
        ))}
      </section>

      <button type="button" onClick={onSignOut} className="h-10 w-full rounded-full border-[1.5px] border-[var(--p1)] bg-[var(--card)] text-sm font-bold text-[var(--p1)]">Sign out</button>
    </>
  );
}