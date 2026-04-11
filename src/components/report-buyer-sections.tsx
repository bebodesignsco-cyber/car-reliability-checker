import type { ReliabilityProfile } from "@/types";
import { formatUrlSegment } from "@/lib/format-url-segment";

type ReportBuyerSectionsProps = {
  make: string;
  model: string;
  subject: string;
  profile: ReliabilityProfile;
};

/**
 * Editorial SEO blocks for buyer-intent queries (AU).
 */
export function ReportBuyerSections({
  make,
  model,
  subject,
  profile,
}: ReportBuyerSectionsProps) {
  const vehicle = `${formatUrlSegment(make)} ${formatUrlSegment(model)} ${subject}`;
  const years = profile.yearsRange;

  const bestCombo = profile.recommendedConfigurations[0]?.combo ?? "See recommendations above.";
  const worstCombo = profile.configurationsToAvoid[0]?.combo ?? "See avoid list above.";

  return (
    <section
      className="border-2 border-foreground bg-background p-6 sm:p-8 md:p-10"
      aria-labelledby="buyer-guide-heading"
    >
      <h2
        id="buyer-guide-heading"
        className="text-xs font-bold uppercase leading-snug tracking-wide text-foreground"
      >
        Used car buyer guide (Australia)
      </h2>
      <div className="mt-6 space-y-6 text-base leading-relaxed text-foreground sm:text-[1.05rem]">
        <div>
          <h3 className="text-sm font-bold text-foreground">Common problems & platform risks</h3>
          <p className="mt-2">
            For the {vehicle} ({years}), recurring issues often cluster around specific engines,
            transmissions, and shared chassis electronics. The trust score reflects how often serious
            powertrain or drivetrain problems show up in real-world reports versus routine
            maintenance. Always verify with a pre-purchase inspection and service history.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">What to inspect before you buy</h3>
          <p className="mt-2">
            Use the platform-wide inspection list above for leaks, rust, suspension wear, and
            electronics. On a test drive, listen for drivetrain noises, check transmission behaviour
            when hot, and scan for warning lights. In Australia, heat and urban short trips can
            accelerate wear—factor in climate-appropriate servicing.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Best engine or trim to target</h3>
          <p className="mt-2">
            A typical starting point is configurations similar to: <strong>{bestCombo}</strong>.
            Cross-check against the recommended list and your budget; the &quot;sweet spot&quot;
            often balances fewer reported failures with parts availability.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Configurations to be cautious about</h3>
          <p className="mt-2">
            Sources frequently flag higher risk around: <strong>{worstCombo}</strong>. That does
            not mean every car fails—use it as a prioritisation list for inspection and price
            negotiation.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Ownership cost signals</h3>
          <p className="mt-2">
            Higher reported failure rates usually mean more workshop time and parts cost. Before
            buying, get quotes for common jobs on this generation (timing, fluids, suspension,
            transmission service) from an independent specialist familiar with the brand.
          </p>
        </div>
      </div>
    </section>
  );
}
