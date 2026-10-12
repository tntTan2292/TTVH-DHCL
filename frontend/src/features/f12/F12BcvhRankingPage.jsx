import BcvhRankingPage from '../ranking/BcvhRankingPage.jsx';
import { IndicatorProvider } from '../indicator/IndicatorContext.js';
import { F12_INDICATOR } from '../indicator/indicatorConfig.js';

export default function F12BcvhRankingPage() {
  return (
    <IndicatorProvider indicator={F12_INDICATOR}>
      <BcvhRankingPage />
    </IndicatorProvider>
  );
}
