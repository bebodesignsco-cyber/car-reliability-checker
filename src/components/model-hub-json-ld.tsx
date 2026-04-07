import { getSiteUrl, SITE_NAME } from "@/lib/site-config";

function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

type ModelHubJsonLdProps = {
  makeSlug: string;
  modelSlug: string;
  makeName: string;
  modelName: string;
};

export function ModelHubJsonLd({
  makeSlug,
  modelSlug,
  makeName,
  modelName,
}: ModelHubJsonLdProps) {
  const base = getSiteUrl();
  const url = `${base}/used-car-reliability/${makeSlug}/${modelSlug}`;
  const description = `Used car reliability for ${makeName} ${modelName} in Australia: generation guides with trust scores, buy vs avoid configurations, and inspection points.`;

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
        item: `${base}/used-car-reliability/${makeSlug}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: modelName,
        item: url,
      },
    ],
  };

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: `${makeName} ${modelName} used car reliability | ${SITE_NAME}`,
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
