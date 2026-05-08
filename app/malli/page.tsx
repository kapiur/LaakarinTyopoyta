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
          `,
        }}
      />
    </div>
  );
}
