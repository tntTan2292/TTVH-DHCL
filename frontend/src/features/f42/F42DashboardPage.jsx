import DashboardPage from '../dashboard/DashboardPage';
import { IndicatorProvider } from '../indicator/IndicatorContext.js';
import { F42_INDICATOR } from '../indicator/indicatorConfig.js';

export default function F42DashboardPage() {
  return (
    <IndicatorProvider indicator={F42_INDICATOR}>
      <DashboardPage />
    </IndicatorProvider>
  );
}
