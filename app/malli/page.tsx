import TemplatesRedesignPage from '../templates/redesign/page';

export default function MalliPage() {
  return (
    <div className="malli-page-scope">
      <TemplatesRedesignPage />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .malli-page-scope [class*="z-50"][class*="justify-end"] > div[class*="max-w-3xl"] {
              max-width: min(96rem, calc(100vw - 1rem)) !important;
            }

            .malli-page-scope [class*="z-50"][class*="justify-end"] textarea {
              min-height: 60vh !important;
            }

            .malli-page-scope [class*="fixed"][class*="z-"] [class*="max-w-sm"],
            .malli-page-scope [class*="fixed"][class*="z-"] [class*="max-w-md"],
            .malli-page-scope [class*="fixed"][class*="z-"] [class*="max-w-lg"],
            .malli-page-scope [class*="fixed"][class*="z-"] [class*="max-w-xl"] {
              width: min(72rem, calc(100vw - 2rem)) !important;
              max-width: min(72rem, calc(100vw - 2rem)) !important;
            }

            .malli-page-scope [class*="fixed"][class*="z-"] [class*="max-w-sm"] textarea,
            .malli-page-scope [class*="fixed"][class*="z-"] [class*="max-w-md"] textarea,
            .malli-page-scope [class*="fixed"][class*="z-"] [class*="max-w-lg"] textarea,
            .malli-page-scope [class*="fixed"][class*="z-"] [class*="max-w-xl"] textarea {
              min-height: 45vh !important;
            }

            body:has(.malli-page-scope) div[class*="fixed"][class*="z-"]:not([class*="justify-end"]):not([class*="inset-0"]) {
              width: min(82rem, calc(100vw - 3rem)) !important;
              max-width: min(82rem, calc(100vw - 3rem)) !important;
              min-width: min(82rem, calc(100vw - 3rem)) !important;
              max-height: min(90vh, calc(100vh - 3rem)) !important;
              top: 50% !important;
              left: 50% !important;
              right: auto !important;
              bottom: auto !important;
              transform: translate(-50%, -50%) !important;
            }

            body:has(.malli-page-scope) div[class*="fixed"][class*="z-"]:not([class*="justify-end"]):not([class*="inset-0"]) textarea {
              min-height: 26vh !important;
            }

            body:has(.malli-page-scope) div[class*="fixed"][class*="z-"]:not([class*="justify-end"]):not([class*="inset-0"]) [class*="overflow-y-auto"],
            body:has(.malli-page-scope) div[class*="fixed"][class*="z-"]:not([class*="justify-end"]):not([class*="inset-0"]) [class*="overflow-auto"] {
              max-height: calc(90vh - 9rem) !important;
            }
          `,
        }}
      />
    </div>
  );
}
