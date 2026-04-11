import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-config";
import type { ReliabilityProfile } from "@/types";
import { formatUrlSegment } from "@/lib/format-url-segment";

function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** WebSite + Organization for the homepage. */
export function HomeJsonLd() {
  const base = getSiteUrl();
  const orgId = `${base}/#organization`;
  const websiteId = `${base}/#website`;

  const graph: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: SITE_NAME,
        url: base,
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: SITE_NAME,
        url: base,
        description: SITE_DESCRIPTION,
        inLanguage: "en-AU",
        publisher: { "@id": orgId },
      },
    ],
  };

  return <JsonLdScript data={graph} />;
}

type GenerationJsonLdProps = {
  make: string;
  model: string;
  segment: string;
  subject: string;
  profile: ReliabilityProfile;
  faqItems: { question: string; answer: string }[];
};

export function GenerationPageJsonLd({
  make,
  model,
  segment,
  subject,
  profile,
  faqItems,
}: GenerationJsonLdProps) {
  const base = getSiteUrl();
  const path = `/${make}/${model}/${segment}`;
  const url = `${base}${path}`;
  const headline = `${formatUrlSegment(make)} ${formatUrlSegment(model)} ${subject}`;
  const description = `Used car reliability in Australia for ${headline} (${profile.yearsRange}). Trust score ${profile.trustScore}/100, buy vs avoid configurations, and inspection points.`;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: base,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Used car reliability",
        item: `${base}/used-car-reliability`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: formatUrlSegment(make),
        item: `${base}/used-car-reliability/${make}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: formatUrlSegment(model),
        item: `${base}/used-car-reliability/${make}/${model}`,
      },
      {
        "@type": "ListItem",
        position: 5,
        name: subject,
        item: url,
      },
    ],
  };

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: `${headline} | ${SITE_NAME}`,
    description,
    inLanguage: "en-AU",
    isPartOf: { "@id": `${base}/#website` },
    about: {
      "@type": "Product",
      name: `${headline} (${profile.yearsRange})`,
      description,
    },
  };

  const faq =
    faqItems.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }
      : null;

  return (
    <>
      <JsonLdScript data={breadcrumb} />
      <JsonLdScript data={webPage} />
      {faq ? <JsonLdScript data={faq} /> : null}
    </>
  );
}
