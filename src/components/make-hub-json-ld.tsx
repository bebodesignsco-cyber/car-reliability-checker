import { getSiteUrl, SITE_NAME } from "@/lib/site-config";

function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

type MakeHubJsonLdProps = {
  makeSlug: string;
  makeName: string;
};

export function MakeHubJsonLd({ makeSlug, makeName }: MakeHubJsonLdProps) {
  const base = getSiteUrl();
  const url = `${base}/used-car-reliability/${makeSlug}`;
  const description = `Used car reliability guides for ${makeName} in Australia: models, model years, trust scores, and inspection points.`;

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
        name: makeName,
        item: url,
      },
    ],
  };

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: `${makeName} used car reliability | ${SITE_NAME}`,
    description,
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
