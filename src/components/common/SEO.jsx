import { useEffect } from 'react';

/**
 * Lightweight dynamic SEO component for client-side routing.
 * Ensures document title and meta tags accurately reflect page context and target keywords.
 */
const SEO = ({
  title = 'OHReferral | UK Occupational Health Referral Platform & OH Provider Network',
  description = 'Connect UK businesses with accredited local OH providers. Fast referral matching for employee issues, mental health support, statutory health surveillance, and preplacements.',
  keywords = 'employee issues, mental health, referral, occupational health, oh provider, health surveillance, management referral, workplace health, preplacement assessment',
  canonicalUrl = window.location.href
}) => {
  useEffect(() => {
    // 1. Update Document Title
    document.title = title;

    // Helper to set or create a meta tag
    const setMetaTag = (nameAttr, nameValue, content) => {
      let element = document.querySelector(`meta[${nameAttr}="${nameValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(nameAttr, nameValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 2. Set Standard Meta Tags
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'keywords', keywords);
    setMetaTag('name', 'robots', 'index, follow');

    // 3. Set Open Graph Meta Tags
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:type', 'website');

    // 4. Set Twitter Meta Tags
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);

    // 5. Update Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }, [title, description, keywords, canonicalUrl]);

  return null;
};

export default SEO;
