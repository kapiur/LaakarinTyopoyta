import type { ReactNode } from 'react';
import DefaultAiToolVisibilityCard from '../../components/DefaultAiToolVisibilityCard';

export default function AiToolsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      {children}
      <DefaultAiToolVisibilityCard />
    </div>
  );
}
