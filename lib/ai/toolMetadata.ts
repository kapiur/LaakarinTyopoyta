export type DefaultAiToolKey = 'fix' | 'translate' | 'summarize' | 'labrat';

export type DefaultAiToolMetadata = {
  key: DefaultAiToolKey;
  label: string;
  description: string;
  icon: 'ListChecks' | 'Languages' | 'Scissors' | 'FlaskConical';
};

export const DEFAULT_AI_TOOL_METADATA: DefaultAiToolMetadata[] = [
  {
    key: 'fix',
    label: 'Korjaa',
    description: 'Korjaa suomenkielinen kliininen teksti ja listaa korjaukset.',
    icon: 'ListChecks',
  },
  {
    key: 'translate',
    label: 'Käännä',
    description: 'Käännä teksti ammattimaiselle lääketieteelliselle suomelle.',
    icon: 'Languages',
  },
  {
    key: 'summarize',
    label: 'Tiivistä',
    description: 'Laadi potilastiedoista kliininen vastaanottoa valmisteleva tiivistelmä.',
    icon: 'Scissors',
  },
  {
    key: 'labrat',
    label: 'Labrat',
    description: 'Muotoile laboratoriotulokset potilaskertomukseen sopivaksi riviksi.',
    icon: 'FlaskConical',
  },
];
