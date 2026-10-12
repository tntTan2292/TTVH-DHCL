import DashboardPage from '../dashboard/DashboardPage.jsx';
import { IndicatorProvider } from '../indicator/IndicatorContext.js';
import { F12_INDICATOR } from '../indicator/indicatorConfig.js';

export default function F12DashboardPage() {
  return (
    <IndicatorProvider indicator={F12_INDICATOR}>
      <DashboardPage />
    </IndicatorProvider>
  );
}
