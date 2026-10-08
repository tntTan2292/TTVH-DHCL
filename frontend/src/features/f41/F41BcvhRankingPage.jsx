import BcvhRankingPage from '../ranking/BcvhRankingPage';
import { IndicatorProvider } from '../indicator/IndicatorContext.js';
import { F41_INDICATOR } from '../indicator/indicatorConfig.js';

export default function F41BcvhRankingPage() {
  return (
    <IndicatorProvider indicator={F41_INDICATOR}>
      <BcvhRankingPage />
    </IndicatorProvider>
  );
}
