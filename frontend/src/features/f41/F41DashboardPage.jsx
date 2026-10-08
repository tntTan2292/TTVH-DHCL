import DashboardPage from '../dashboard/DashboardPage';
import { IndicatorProvider } from '../indicator/IndicatorContext.js';
import { F41_INDICATOR } from '../indicator/indicatorConfig.js';

export default function F41DashboardPage() {
  return (
    <IndicatorProvider indicator={F41_INDICATOR}>
      <DashboardPage />
    </IndicatorProvider>
  );
}
