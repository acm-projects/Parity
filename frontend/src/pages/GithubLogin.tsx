import { useState } from 'react';
import Screen from '../components/Screen';
import { ghName, initialsOf } from '../lib/github';
import mark from '../assets/mark.png';

const field = 'flex h-10 items-center rounded-xl border-[1.5px] bg-[var(--field)] px-3 focus-within:border-[var(--p1)]';
const input = 'min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--ink)] outline-none';

export default function GithubLogin({ onBack, onSubmit }: { onBack: () => void; onSubmit: (user: string) => void }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [userErr, setUserErr] = useState(false);
  const [passErr, setPassErr] = useState(false);
  const name = ghName(user);

  const submit = () => {
    setUserErr(!name);
    setPassErr(!pass);
    if (!name || !pass) return;
    setPass(''); // never keep the password
    onSubmit(name);
  };
  const enter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') submit(); };

  return (
    <Screen>
      <button type="button" onClick={onBack} className="self-start text-[11px] font-semibold text-[var(--p1)]">&#8249; Back</button>
      <img src={mark} alt="" className="mx-auto mt-2.5 h-[54px] w-auto rounded-xl dark:box-content dark:bg-[#ECE7FF] dark:p-1.5" />
      <div className="text-center">
        <h1 className="m-0 text-2xl font-extrabold tracking-[-.02em]">Sign in with GitHub</h1>
        <p className="mb-0 mt-[5px] text-xs leading-[1.45] text-[var(--muted)]">Enter your GitHub username and password to continue.</p>
      </div>

      <div className="rounded-2xl bg-[var(--card)] px-4 pb-[18px] pt-4 shadow-[0_6px_18px_rgba(91,51,200,.10)]">
        <label htmlFor="ghuser" className="mb-2 block text-[11px] font-bold">GitHub username</label>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br from-[#7A52E8] to-[#4B2BB0] text-sm font-extrabold text-white">
            {name ? initialsOf(name) : '?'}
          </span>
          <div className={`${field} flex-1 ${userErr ? 'border-[var(--err)]' : 'border-[var(--field-border)]'}`}>
            <span className="mr-[3px] text-sm font-bold text-[#8A84A8]">@</span>
            <input id="ghuser" className={input} value={user} placeholder="octocat" maxLength={60} autoComplete="off" autoCapitalize="none" spellCheck={false}
              onChange={(e) => { setUser(e.target.value); setUserErr(false); }} onKeyDown={enter} />
          </div>
        </div>
        {userErr && <p role="alert" className="mb-0 mt-2 text-[11px] font-bold text-[#9B2C2C]">Use letters, numbers and single hyphens (up to 39 characters).</p>}

        <label htmlFor="ghpass" className="mb-2 mt-3 block text-[11px] font-bold">Password</label>
        <div className={`${field} gap-2 pr-1.5 ${passErr ? 'border-[var(--err)]' : 'border-[var(--field-border)]'}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A84A8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="flex-none" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          <input id="ghpass" className={input} type={show ? 'text' : 'password'} value={pass} placeholder="Your password" autoComplete="off" spellCheck={false}
            onChange={(e) => { setPass(e.target.value); setPassErr(false); }} onKeyDown={enter} />
          <button type="button" aria-pressed={show} aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}
            className="flex-none p-2 text-[11px] font-bold text-[var(--p1)]">{show ? 'Hide' : 'Show'}</button>
        </div>
        {passErr && <p role="alert" className="mb-0 mt-2 text-[11px] font-bold text-[#9B2C2C]">Enter your password.</p>}

        {import.meta.env.DEV && (
          <div className="mt-2 flex justify-end text-[11px]">
            <button type="button" className="font-bold text-[var(--p1)]" onClick={() => { setUser('octocat'); setPass('demo-password'); }}>Try an example</button>
          </div>
        )}
        <button type="button" onClick={submit}
          className="mt-2.5 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-[linear-gradient(180deg,#6F47DB,#5A32C6)] text-sm font-bold text-white shadow-[0_8px_18px_rgba(90,50,198,.3)]">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" /></svg>
          Sign in with GitHub
        </button>
      </div>

      <div className="flex-1" />
      <p className="m-0 text-center text-[11px] text-[var(--muted)]">Free for individuals &middot; No credit card needed</p>
    </Screen>
  );
}