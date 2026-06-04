import TemplatesRedesignPage from '../templates/redesign/page';
import MalliAgentDock from '../../components/ai-agent/MalliAgentDock';
import MalliAgentDraftApplier from '../../components/ai-agent/MalliAgentDraftApplier';

export default function MalliPage() {
  return (
    <div className="malli-page-scope">
      <TemplatesRedesignPage />
      <MalliAgentDock />
      <MalliAgentDraftApplier />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .malli-page-scope [class*="z-50"][class*="justify-end"] > div[class*="max-w-3xl"] {
              max-width: min(96rem, calc(100vw - 1rem)) !important;
            }

            .malli-page-scope [class*="z-50"][class*="justify-end"] textarea[class*="font-mono"] {
              min-height: 60vh !important;
            }
          `,
        }}
      />
    </div>
  );
}
