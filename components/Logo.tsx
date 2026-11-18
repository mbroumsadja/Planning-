const ROWS = [
  ["permanence", "garde", "repos"],
  ["repos", "permanence", "garde"],
  ["garde", "repos", "permanence"],
] as const;

const FILL = {
  standard: { permanence: "#175CD3", garde: "#B42318", repos: "#027A48" },
  clair: { permanence: "#DCEBFF", garde: "#FEE4E2", repos: "#D5F5E3" },
};

/** Symbole : chaque ligne reprend le cycle permanence, garde, repos, décalé d'un cran (la relève des équipes). */
export function LogoMark({
  size = 32,
  tone = "standard",
  title,
}: {
  size?: number;
  tone?: "standard" | "clair";
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className="shrink-0"
    >
      {ROWS.map((row, r) =>
        row.map((type, c) => (
          <rect key={`${r}-${c}`} x={c * 34} y={r * 34} width={28} height={28} rx={7} fill={FILL[tone][type]} />
        )),
      )}
    </svg>
  );
}

/** Symbole + nom. Le point final est toujours vert. */
export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="font-display leading-none text-ink" style={{ fontSize: size * 0.95 }}>
        Planning<span className="text-brand">.</span>
      </span>
    </span>
  );
}
