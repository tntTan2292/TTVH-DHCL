import BcvhRankingPage from '../ranking/BcvhRankingPage';
import { IndicatorProvider } from '../indicator/IndicatorContext.js';
import { F42_INDICATOR } from '../indicator/indicatorConfig.js';

export default function F42BcvhRankingPage() {
  return (
    <IndicatorProvider indicator={F42_INDICATOR}>
      <BcvhRankingPage />
    </IndicatorProvider>
  );
}
