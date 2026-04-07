import type {
  ConfigurationToAvoid,
  RecommendedConfiguration,
} from "@/types";

type ReliabilityColumnProps =
  | {
      variant: "buy";
      items: RecommendedConfiguration[];
      className?: string;
    }
  | {
      variant: "avoid";
      items: ConfigurationToAvoid[];
      className?: string;
    };

const shells = {
  buy: {
    shell:
      "border-emerald-600/90 bg-emerald-50/40 dark:border-emerald-500 dark:bg-emerald-950/25",
    title: "text-emerald-900 dark:text-emerald-100",
    accent: "bg-emerald-600 dark:bg-emerald-500",
    combo: "text-emerald-950 dark:text-emerald-50",
    detail: "text-emerald-900 dark:text-emerald-200/95",
    headingId: "recommended-configs-heading",
    titleText: "RECOMMENDED CONFIGURATIONS (THE 'BUY' LIST)",
  },
  avoid: {
    shell:
      "border-red-600 bg-red-50/90 dark:border-red-500 dark:bg-red-950/40",
    title: "text-red-950 dark:text-red-50",
    accent: "bg-red-600 dark:bg-red-500",
    combo: "text-red-950 dark:text-red-50",
    detail: "text-red-950 dark:text-red-100",
    headingId: "avoid-configs-heading",
    titleText: "CONFIGURATIONS TO AVOID (THE 'LEMON' LIST)",
  },
} as const;

export function ReliabilityColumn(props: ReliabilityColumnProps) {
  const { variant, className = "" } = props;
  const s = shells[variant];

  return (
    <section
      className={`relative border-2 p-6 sm:p-8 ${s.shell} ${className}`}
      aria-labelledby={s.headingId}
    >
      <div
        className={`absolute left-0 top-0 h-full w-1 ${s.accent}`}
        aria-hidden
      />
      <h2
        id={s.headingId}
        className={`pl-4 text-xs font-bold uppercase leading-snug tracking-wide ${s.title}`}
      >
        {s.titleText}
      </h2>

      {variant === "buy" ? (
        <ul className="mt-6 space-y-6 pl-4" role="list">
          {props.items.map((item) => (
            <li key={item.combo}>
              <p className={`text-base font-semibold leading-snug ${s.combo}`}>
                {item.combo}
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5" role="list">
                {item.strengths.map((line) => (
                  <li
                    key={line}
                    className={`text-base leading-relaxed ${s.detail}`}
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-6 space-y-6 pl-4" role="list">
          {props.items.map((item) => (
            <li key={item.combo}>
              <p className={`text-base font-semibold leading-snug ${s.combo}`}>
                {item.combo}
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5" role="list">
                {item.criticalFailures.map((line) => (
                  <li
                    key={line}
                    className={`text-base leading-relaxed ${s.detail}`}
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
