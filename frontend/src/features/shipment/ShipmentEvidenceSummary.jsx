import { Search } from 'lucide-react';
import { ShipmentShellCard } from './ShipmentShellShared';
import { EmptyState, StandardTable, StatusBadge } from '../../components/shared/SharedComponents';

export default function ShipmentEvidenceSummary({
  evidenceContext = [],
  shipmentRows = [],
  selectedShipmentId = '',
  onSelectShipment = () => {},
}) {
  const columns = [
    {
      key: 'shipmentId',
      label: 'Shipment',
      render: (row) => (
        <button
          type="button"
          onClick={() => onSelectShipment?.(row.shipmentId)}
          className={`text-left font-semibold transition-colors hover:text-[var(--color-primary-700)] ${selectedShipmentId === row.shipmentId ? 'text-[var(--color-primary-700)]' : 'text-[var(--color-text-main)]'}`}
        >
          {row.shipmentId}
        </button>
      ),
    },
    { key: 'routeName', label: 'Route' },
    {
      key: 'status',
      label: 'Kết quả',
      render: (row) => (
        <StatusBadge
          label={row.status}
          tone={row.status === 'Đạt' ? 'success' : 'danger'}
        />
      ),
    },
    { key: 'delayHours', label: 'Độ trễ (giờ)' },
  ];

  return (
    <ShipmentShellCard
      title="Evidence Summary"
      description="Tom tat evidence de chuan bi chuyen sang Evidence Center."
      icon={<Search />}
      actionLabel="Decision"
    >
      <div className="space-y-4">
        <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
          {evidenceContext.length > 0 ? evidenceContext.map((item) => <p key={item}>{item}</p>) : <p>Evidence context placeholder</p>}
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-main)]">Shipment candidates</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Chọn shipment để đồng bộ toàn bộ context runtime sang các widget còn lại.
            </p>
          </div>

          {shipmentRows.length > 0 ? (
            <StandardTable
              columns={columns}
              rows={shipmentRows}
              emptyMessage="Không có shipment runtime"
            />
          ) : (
            <EmptyState
              title="Không có shipment runtime"
              description="Runtime evidence-list không trả về shipment nào cho context hiện tại."
            />
          )}
        </div>
      </div>
    </ShipmentShellCard>
  );
}
