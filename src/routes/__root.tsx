/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCssText from "@/styles/app.css?inline";
import faviconUrl from "@/assets/favicon-192.png";
import { NotFound } from "@/components/not-found";
import { ErrorPage } from "@/components/error-page";
import { getAllSettings } from "@/lib/site-content.functions";
import { mergeSettings, useSiteSettings } from "@/hooks/use-site-settings";
import { siteDefaults } from "@/content/site-defaults";
import { customFontCss, customFontUrls, resolveCustomFonts } from "@/lib/custom-fonts";
import { usePreviewFocus } from "@/lib/preview-focus";

export const Route = createRootRoute({
  // Header and footer copy lives in `site_settings`, so every page needs it. Loading it
  // on the root route means it is in the SSR payload before any child renders.
  loader: () => getAllSettings(),
  head: ({ loaderData }) => {
    const meta = [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Roam Bengal — Explore The Soul of Bangladesh" },
      {
        name: "description",
        content:
          "Private, locally-guided tours across Bangladesh — the Sundarbans, tea gardens, hill tracts and heritage sites. Fair prices, no shopping detours.",
      },
      { name: "theme-color", content: "#1E5F3B" },
    ];

    // Editable from Admin → Site content → Google tools, no redeploy needed.
    const integrations = mergeSettings(siteDefaults.integrations, loaderData?.integrations);
    if (integrations.google_site_verification) {
      meta.push({
        name: "google-site-verification",
        content: integrations.google_site_verification,
      });
    }

    return {
      meta,
      links: [
        { rel: "icon", type: "image/png", href: faviconUrl },
        { rel: "apple-touch-icon", href: faviconUrl },
      ],
    };
  },
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorPage,
});

function RootComponent() {
  usePreviewFocus(true);
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

const APP_CSS_ID = "app-css";

/**
 * The stylesheet text is only needed to server-render the inline `<style>` below. By the
 * time the client runs, that `<style>` is already in the document, so the browser reads it
 * back from there instead of downloading a second ~100 kB copy inside the JS bundle.
 * `import.meta.env.SSR` is a build-time constant, so the client build drops the
 * `?inline` import entirely.
 */
const appCss = import.meta.env.SSR
  ? appCssText
  : (document.getElementById(APP_CSS_ID)?.textContent ?? "");

function RootDocument({ children }: { children: ReactNode }) {
  const { custom_fonts, integrations } = useSiteSettings();
  const fonts = resolveCustomFonts(custom_fonts);
  const fontUrls = customFontUrls(fonts);
  const usesGoogleFonts = fontUrls.some((href) => href.startsWith("https://fonts.googleapis.com/"));
  const gtmId = integrations.gtm_container_id;
  const adsenseClientId = integrations.adsense_client_id;

  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Keep the shell styled even if a stale CDN/HTML response references an old
            content-hashed stylesheet that is no longer present after a deploy. */}
        <style id={APP_CSS_ID} dangerouslySetInnerHTML={{ __html: appCss }} />
        {/* The font stylesheets are render-blocking and live on two other origins; open
            both connections up front rather than one after the other. */}
        {usesGoogleFonts ? (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          </>
        ) : null}
        {/* Admin → Site content → Custom Fonts. One `<style>` for the whole list: it is
            unlayered, so it beats Tailwind's layered utilities whatever order they load in. */}
        {fontUrls.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        {fonts.length ? <style dangerouslySetInnerHTML={{ __html: customFontCss(fonts) }} /> : null}
        {gtmId ? (
          // GA4 and Google Ads are configured as tags inside the GTM container itself —
          // no separate gtag.js snippets needed once this container is live.
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`,
            }}
          />
        ) : null}
        {adsenseClientId ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body>
        {gtmId ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        ) : null}
        <a href="#main" className="sr-only-focusable">
          Skip to content
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
