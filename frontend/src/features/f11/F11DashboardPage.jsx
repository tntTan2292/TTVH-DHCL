import DashboardPage from '../dashboard/DashboardPage.jsx';
import { IndicatorProvider } from '../indicator/IndicatorContext.js';
import { F11_INDICATOR } from '../indicator/indicatorConfig.js';

export default function F11DashboardPage() {
  return (
    <IndicatorProvider indicator={F11_INDICATOR}>
      <DashboardPage />
    </IndicatorProvider>
  );
}
