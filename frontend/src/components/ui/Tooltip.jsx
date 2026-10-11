import React, { useEffect, useId, useRef, useState } from 'react';

/**
 * Modern Tooltip Component (UI-GLASS-THEME-02)
 * Lightweight accessible tooltip: shown on hover and keyboard focus, linked to the trigger by aria-describedby,
 * pending timer is cleared on hide and on unmount.
 */
export default function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
  delay = 150,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef(null);
  const tooltipId = useId();

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  if (!content) return children;

  const showTooltip = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position] || 'bottom-full left-1/2 -translate-x-1/2 mb-2';

  return (
    <div
      className="relative inline-flex"
      aria-describedby={isVisible ? tooltipId : undefined}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute z-50 pointer-events-none whitespace-nowrap rounded-lg bg-slate-900/95 text-white text-xs font-medium py-1.5 px-3 shadow-xl border border-white/10 transition-opacity duration-150 ${positionClasses} ${className}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
