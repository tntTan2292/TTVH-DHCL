import UnifiedBcvhAnalysisTable from './UnifiedBcvhAnalysisTable';

export default function BcvhOperationTableAdapter({ fromDate, toDate, interval, maBcvh }) {
  return (
    <div className="bcvh-operation-table-adapter-wrapper w-full">
      <UnifiedBcvhAnalysisTable
        fromDate={fromDate}
        toDate={toDate}
        interval={interval}
        maBcvh={maBcvh}
      />
    </div>
  );
}
