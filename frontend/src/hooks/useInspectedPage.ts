import { useEffect, useState } from "react";

export interface InspectedPage {
  title: string;
  path: string;
}

/** Title and path of the page DevTools is inspecting. Updates when that page navigates. */
export function useInspectedPage(): InspectedPage | null {
  const [page, setPage] = useState<InspectedPage | null>(null);
  const dt = typeof chrome === "undefined" ? undefined : chrome?.devtools;

  useEffect(() => {
    if (!dt) return;
    const read = () =>
      dt.inspectedWindow.eval("({ title: document.title, path: location.pathname })", (result, info) => {
        if (!result || info?.isError || info?.isException) return;
        const r = result as InspectedPage;
        setPage((old) => (old && old.title === r.title && old.path === r.path ? old : r));
      });
    read();
    // A navigation fires before the new page has a title, so read again a moment later.
    const onNav = () => {
      read();
      setTimeout(read, 600);
    };
    const nav = dt.network?.onNavigated;
    nav?.addListener(onNav);
    return () => nav?.removeListener(onNav);
  }, [dt]);

  return page;
}
