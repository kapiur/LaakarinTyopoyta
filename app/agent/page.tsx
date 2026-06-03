import AgentPanel from "../../components/ai-agent/AgentPanel";

export default function AgentPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-2">AI-agentti MVP</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ohjattu AI-agentti</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-3xl">
          Ensimmäinen käyttöliittymä agentille. Agentti voi analysoida, luonnostella ja ehdottaa jatkotoimia, mutta se ei tallenna tai muuta tietoja automaattisesti.
        </p>
      </header>

      <AgentPanel defaultContextType="clinicalText" />
    </div>
  );
}
