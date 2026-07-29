import { useMemo } from 'react';
import BcvhOperationTable from '../../../components/f13/BcvhOperationTable';

export default function BcvhOperationTableAdapter({ fromDate, toDate, interval, maBcvh }) {
  const globalFilter = useMemo(() => ({
    dateRange: [fromDate, toDate],
    interval,
    maBcvh,
  }), [fromDate, interval, maBcvh, toDate]);

  return (
    <div className="bcvh-operation-table-adapter-wrapper w-full">
      <BcvhOperationTable globalFilter={globalFilter} />
    </div>
  );
}
