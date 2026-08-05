import { useState, useMemo, useEffect, useRef } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function CalendarDatePicker({
  value = '',
  onChange,
  availableDates = [],
  placeholder = '-- Chọn ngày --',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Fast O(1) set lookup for available dates (ISO strings YYYY-MM-DD)
  const availableSet = useMemo(() => new Set(availableDates || []), [availableDates]);

  // Extract unique years present in available dates
  const availableYears = useMemo(() => {
    const set = new Set();
    (availableDates || []).forEach((d) => {
      if (typeof d === 'string' && d.length >= 4) {
        set.add(Number(d.slice(0, 4)));
      }
    });
    const arr = Array.from(set).sort((a, b) => b - a);
    return arr.length > 0 ? arr : [new Date().getFullYear()];
  }, [availableDates]);

  // Current view Year & Month
  const [viewYear, setViewYear] = useState(() => {
    if (value && value.length >= 4) return Number(value.slice(0, 4));
    if (availableDates.length > 0) return Number(availableDates[0].slice(0, 4));
    return new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState(() => {
    if (value && value.length >= 7) return Number(value.slice(5, 7)) - 1;
    if (availableDates.length > 0) return Number(availableDates[0].slice(5, 7)) - 1;
    return new Date().getMonth();
  });

  // Sync view when value or availableDates change
  useEffect(() => {
    if (value && value.length >= 7) {
      setViewYear(Number(value.slice(0, 4)));
      setViewMonth(Number(value.slice(5, 7)) - 1);
    } else if (availableDates.length > 0 && !value) {
      setViewYear(Number(availableDates[0].slice(0, 4)));
      setViewMonth(Number(availableDates[0].slice(5, 7)) - 1);
    }
  }, [value, availableDates]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format YYYY-MM-DD to DD/MM/YYYY
  const formatDisplayDate = (isoStr) => {
    if (!isoStr || typeof isoStr !== 'string') return '';
    const parts = isoStr.split('-');
    if (parts.length !== 3) return isoStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Month names for selector
  const monthNames = [
    'Tháng 01', 'Tháng 02', 'Tháng 03', 'Tháng 04',
    'Tháng 05', 'Tháng 06', 'Tháng 07', 'Tháng 08',
    'Tháng 09', 'Tháng 10', 'Tháng 11', 'Tháng 12',
  ];

  // Calendar grid computation (Monday-Sunday layout)
  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    let startDayOfWeek = firstDay.getDay() - 1; // 0 = Mon, 6 = Sun
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];

    // Empty cells before start of month
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ dayNum: null, key: `empty-${i}` });
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const mm = String(viewMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const isoDate = `${viewYear}-${mm}-${dd}`;
      const hasData = availableSet.has(isoDate);

      cells.push({
        dayNum: day,
        isoDate,
        hasData,
        key: `day-${day}`,
      });
    }

    return cells;
  }, [viewYear, viewMonth, availableSet]);

  const handleSelectDay = (cell) => {
    if (!cell.hasData || disabled) return;
    onChange(cell.isoDate);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="relative inline-block w-full" ref={containerRef}>
      {/* Input Field Display */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between border rounded-lg px-3 py-1.5 text-xs bg-white transition-all text-left ${
          disabled
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            : isOpen
            ? 'border-blue-500 ring-1 ring-blue-500 text-gray-900 shadow-sm'
            : 'border-gray-300 hover:border-gray-400 text-gray-800'
        }`}
      >
        <span className={value ? 'font-bold text-blue-900' : 'text-gray-400'}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e)}
              className="p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600"
              title="Xóa ngày đã chọn"
            >
              <X size={12} />
            </span>
          )}
          <CalendarDays size={14} className={value ? 'text-blue-600' : 'text-gray-400'} />
        </div>
      </button>

      {/* Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-[2000] w-72 bg-white rounded-xl border border-gray-200 shadow-xl p-3 text-xs">
          {/* Header Controls: Month/Year navigation */}
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900"
              title="Tháng trước"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1 font-bold text-gray-800">
              {/* Month Select */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-xs font-semibold focus:outline-none focus:border-blue-500"
              >
                {monthNames.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Select */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-xs font-semibold focus:outline-none focus:border-blue-500"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900"
              title="Tháng sau"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Data Indicator Legend */}
          <div className="flex items-center justify-between mb-2 text-[10px] text-gray-500 px-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> Ngày có dữ liệu
            </span>
            <span className="text-gray-400">Xám = Không có dữ liệu</span>
          </div>

          {/* Weekday Header (Monday to Sunday) */}
          <div className="grid grid-cols-7 text-center font-semibold text-gray-500 mb-1 text-[11px]">
            <span>T2</span>
            <span>T3</span>
            <span>T4</span>
            <span>T5</span>
            <span>T6</span>
            <span>T7</span>
            <span className="text-red-500">CN</span>
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarCells.map((cell) => {
              if (!cell.dayNum) {
                return <div key={cell.key} className="h-7" />;
              }

              const isSelected = value === cell.isoDate;
              const hasData = cell.hasData;

              return (
                <button
                  type="button"
                  key={cell.key}
                  disabled={!hasData}
                  onClick={() => handleSelectDay(cell)}
                  className={`h-7 w-full rounded-lg flex flex-col items-center justify-center relative transition-all text-xs ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : hasData
                      ? 'bg-blue-50/70 text-blue-900 font-bold hover:bg-blue-100 hover:scale-105 cursor-pointer border border-blue-200'
                      : 'text-gray-300 bg-gray-50/40 cursor-not-allowed font-normal'
                  }`}
                >
                  <span>{cell.dayNum}</span>
                  {hasData && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-blue-600 absolute bottom-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
