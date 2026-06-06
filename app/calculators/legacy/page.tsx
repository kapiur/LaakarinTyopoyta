import LegacyCalculatorsPage from '../../../components/calculators/LegacyCalculatorsPage';

export default function CalculatorLegacyPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  return <LegacyCalculatorsPage initialTab={searchParams?.tab} />;
}
