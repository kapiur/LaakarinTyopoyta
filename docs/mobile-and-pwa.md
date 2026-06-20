# Mobile layout and PWA

## Responsive shell

- Below `md`, the desktop sidebar is replaced by a modal navigation drawer.
- The application shell uses `100dvh` and safe-area insets for mobile browser chrome and device cutouts.
- Below `xl`, the dashboard assistant opens as a focused overlay instead of consuming workspace width.
- Templates, quick guides, literature and medicines use a sequential single-column workflow on narrow screens.

## Installation

The application exposes `/manifest.webmanifest`, install icons and `/sw.js`. On browsers that support the `beforeinstallprompt` event, an install icon appears in the mobile header. On iOS, installation remains available through Safari's Share menu and **Add to Home Screen**.

Production must use HTTPS for service-worker registration and installation. Localhost is accepted for development.

## Privacy and caching

The service worker caches only same-origin icon files and versioned `/_next/static/` assets. It does not intercept or cache:

- application pages;
- API requests or responses;
- AI conversations or generated results;
- clinical, user or patient data.

## Verification

Verify at minimum these viewport sizes after UI changes:

- phone: `390 x 844`;
- tablet portrait: `768 x 1024`;
- desktop: `1440 x 900`.

Check navigation drawer, safe areas, assistant overlay, forms, long medical terms, tables and installability.
