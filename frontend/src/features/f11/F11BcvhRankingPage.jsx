import BcvhRankingPage from '../ranking/BcvhRankingPage.jsx';
import { IndicatorProvider } from '../indicator/IndicatorContext.js';
import { F11_INDICATOR } from '../indicator/indicatorConfig.js';

export default function F11BcvhRankingPage() {
  return (
    <IndicatorProvider indicator={F11_INDICATOR}>
      <BcvhRankingPage />
    </IndicatorProvider>
  );
}
