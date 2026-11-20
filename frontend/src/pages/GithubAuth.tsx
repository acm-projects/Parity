import mark from '../assets/mark.png';

const PERMS = [
  { title: 'Read your profile', sub: 'Name, avatar and email address' },
  { title: 'Read your repositories', sub: 'So we can find the site to compare' },
  { title: 'Create branches and pull requests', sub: 'To commit fixes for you to review' },
];

interface Props { user: string; onAuthorize: () => void; onCancel: () => void }

export default function GithubAuth({ user, onAuthorize, onCancel }: Props) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col gap-3 bg-[#F6F8FA] p-4 text-[#1F2328]">
      <div className="mt-1.5 flex items-center justify-center gap-3">
        <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#D0D7DE] bg-white">
          <img src={mark} alt="" className="h-[30px] w-auto" />
        </span>
        <span className="font-extrabold tracking-[3px] text-[#8C959F]">&middot; &middot; &middot;</span>
        <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#1F2328] text-[11px] font-extrabold text-white">GH</span>
      </div>
      <div className="text-center">
        <h1 className="m-0 text-xl font-bold">Authorize Parity</h1>
        <p className="mb-0 mt-1 text-[11px] leading-[1.45] text-[#59636E]">Parity wants to access your<br />GitHub account <b className="text-[#1F2328]">@{user}</b></p>
      </div>
      <div className="rounded-[10px] border border-[#D0D7DE] bg-white px-3.5 py-2.5">
        <div className="mb-0.5 text-[11px] font-bold text-[#59636E]">Parity will be able to</div>
        {PERMS.map((p) => (
          <div key={p.title} className="flex gap-3 border-t border-[#E6EAEE] py-[9px]">
            <span className="mt-px flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-[#1F883D]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
            </span>
            <div>
              <div className="text-xs font-bold">{p.title}</div>
              <div className="mt-px text-[11px] text-[#59636E]">{p.sub}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1" />
      <button type="button" onClick={onAuthorize} className="h-10 rounded-lg bg-[#1F883D] text-sm font-bold text-white">Authorize Parity</button>
      <button type="button" onClick={onCancel} className="h-9 rounded-lg border border-[#D0D7DE] bg-[#F6F8FA] text-sm font-bold">Cancel</button>
    </div>
  );
}