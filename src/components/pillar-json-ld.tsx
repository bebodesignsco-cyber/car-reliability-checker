import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-config";

function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** WebPage + BreadcrumbList for the /used-car-reliability pillar. */
export function PillarJsonLd() {
  const base = getSiteUrl();
  const url = `${base}/used-car-reliability`;

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
        item: url,
      },
    ],
  };

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: `Used car reliability in Australia | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    inLanguage: "en-AU",
    isPartOf: { "@id": `${base}/#website` },
  };

  return (
    <>
      <JsonLdScript data={breadcrumb} />
      <JsonLdScript data={webPage} />
    </>
  );
}
