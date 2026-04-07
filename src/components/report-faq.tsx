type FaqItem = { question: string; answer: string };

type ReportFaqProps = {
  items: FaqItem[];
};

/** Visible FAQ matching FAQPage JSON-LD. */
export function ReportFaq({ items }: ReportFaqProps) {
  if (items.length === 0) return null;

  return (
    <section
      className="border-2 border-foreground bg-background p-6 sm:p-8 md:p-10"
      aria-labelledby="faq-heading"
    >
      <h2
        id="faq-heading"
        className="text-xs font-bold uppercase leading-snug tracking-wide text-foreground"
      >
        Frequently asked questions
      </h2>
      <dl className="mt-6 space-y-6">
        {items.map((item) => (
          <div key={item.question}>
            <dt className="text-base font-bold text-foreground">{item.question}</dt>
            <dd className="mt-2 text-base leading-relaxed text-foreground sm:text-[1.05rem]">
              {item.answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
