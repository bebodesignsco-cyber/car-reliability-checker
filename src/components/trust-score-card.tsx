import type { TrustVerdict } from "@/lib/trust-verdict";

type TrustScoreCardProps = {
  score: number;
  maxScore?: number;
  verdict: TrustVerdict;
  className?: string;
};

export function TrustScoreCard({
  score,
  maxScore = 100,
  verdict,
  className = "",
}: TrustScoreCardProps) {
  const clamped = Math.min(maxScore, Math.max(0, score));

  return (
    <section
      className={`border-2 border-foreground bg-background p-8 sm:p-10 md:p-12 ${className}`}
      aria-labelledby="trust-score-heading"
    >
      <h2 id="trust-score-heading" className="sr-only">
        Trust score and verdict
      </h2>
      <p className="text-3xl font-bold uppercase leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
        Trust score: {clamped} / {maxScore}
      </p>
      <p className="mt-6 text-xl font-bold uppercase tracking-wide text-foreground sm:text-2xl">
        Verdict: {verdict}
      </p>
    </section>
  );
}
