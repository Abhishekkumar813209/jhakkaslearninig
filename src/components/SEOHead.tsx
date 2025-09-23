import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  noIndex?: boolean;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = "EduTech Learning Platform",
  description = "Premium online learning platform with unlimited tests, personalized learning paths, and detailed analytics for students.",
  keywords = "online learning, test series, education, analytics, learning paths, student portal",
  canonical,
  ogTitle,
  ogDescription,
  ogImage = "/hero-education.jpg",
  noIndex = false
}) => {
  const fullTitle = title.includes("EduTech") ? title : `${title} | EduTech Learning Platform`;
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {!noIndex && <meta name="robots" content="index, follow" />}
      
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={ogTitle || fullTitle} />
      <meta property="og:description" content={ogDescription || description} />
      <meta property="og:image" content={ogImage} />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={currentUrl} />
      <meta property="twitter:title" content={ogTitle || fullTitle} />
      <meta property="twitter:description" content={ogDescription || description} />
      <meta property="twitter:image" content={ogImage} />
      
      {/* Structured Data for Educational Platform */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "EducationalOrganization",
          "name": "EduTech Learning Platform",
          "description": description,
          "url": currentUrl,
          "logo": ogImage,
          "sameAs": [],
          "offers": {
            "@type": "Offer",
            "name": "Premium Learning Subscription",
            "description": "Unlimited tests, learning paths, and analytics",
            "price": "299",
            "priceCurrency": "INR",
            "availability": "https://schema.org/InStock"
          }
        })}
      </script>
    </Helmet>
  );
};

export default SEOHead;