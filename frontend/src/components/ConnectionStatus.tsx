interface Props {
  file: string;
}

export default function ConnectionStatus({ file }: Props) {
  return (
    <span className="inline-flex h-8 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--card)] px-3 text-xs font-semibold text-[var(--ink2)]">
      <i
        className={`h-1.5 w-1.5 flex-none rounded-full ${file ? "bg-[var(--ok)]" : "bg-[var(--p3)]"}`}
      />
      {file ? (
        <>
          Connected to
          <span className="inline-block max-w-[120px] truncate">{file}</span>
        </>
      ) : (
        "No file connected"
      )}
    </span>
  );
}