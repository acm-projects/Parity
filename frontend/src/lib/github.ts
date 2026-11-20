const GH_USER = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/** Accepts 'octocat', '@octocat' or a github.com link. Returns the username or null. */
export function ghName(v: string): string | null {
  const s = v.trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^(www\.)?github\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[\/?#].*$/, '');
  return GH_USER.test(s) ? s : null;
}

export function initialsOf(user: string): string {
  const parts = user.split(/[-_.]/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : user.slice(0, 2)).toUpperCase();
}

// Files that are most likely the one that starts the app. They go to the top of the list.
const LIKELY = [
  /^src\/main\.(tsx|jsx|ts|js)$/,
  /^src\/index\.(tsx|jsx|ts|js)$/,
  /(^|\/)main\.(tsx|jsx|ts|js)$/,
  /(^|\/)index\.(tsx|jsx|ts|js)$/,
  /(^|\/)_app\.(tsx|jsx|ts|js)$/,
  /(^|\/)App\.(tsx|jsx)$/,
];
const likeliness = (path: string) => {
  const i = LIKELY.findIndex((re) => re.test(path));
  return i < 0 ? LIKELY.length : i;
};

/**
 * Files a user can pick: the JS/TS file that starts the app (Parity adds a new CSS file and imports it there),
 * or a stylesheet (Parity edits it directly). preferred goes first when the repo has it.
 */
export function entryChoices(files: string[], preferred?: string): string[] {
  const rank = (f: string) => (f === preferred ? -1 : /\.css$/.test(f) ? LIKELY.length + 1 : likeliness(f));
  return files
    .filter((f) => /\.(jsx?|tsx?|css)$/.test(f) && !f.includes("node_modules/"))
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .slice(0, 300);
}
