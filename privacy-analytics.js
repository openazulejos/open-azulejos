"use strict";

(function recordPrivacyPreservingPageView() {
  if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true) return;

  const sourceCategory = () => {
    if (!document.referrer) return "direct";
    try {
      const referrer = new URL(document.referrer);
      if (referrer.origin === window.location.origin) return "internal";
      const hostname = referrer.hostname.toLowerCase();
      if (/(^|\.)(google|bing|duckduckgo|ecosia|qwant)\./.test(hostname)) return "search";
      if (/(^|\.)(facebook|instagram|threads|tiktok|linkedin|x|twitter)\./.test(hostname)) return "social";
      return "referral";
    } catch {
      return "direct";
    }
  };

  const currentView = () => document.querySelector('[data-view-mode][aria-selected="true"]')?.dataset.viewMode || "map";
  const record = () => fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    keepalive: true,
    body: JSON.stringify({ event: "page_view", view: currentView(), source: sourceCategory() }),
  }).catch(() => {});

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", record, { once: true });
  else record();
}());
