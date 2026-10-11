import React, { useState } from 'react';

/**
 * Modern Glass Tooltip Component (UI-GLASS-THEME-02)
 * Lightweight accessible tooltip with frosted dark surface and smooth fade.
 */
export default function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
  delay = 150,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  if (!content) return children;

  const showTooltip = () => {
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) clearTimeout(timeoutId);
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
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`absolute z-50 pointer-events-none whitespace-nowrap rounded-lg bg-slate-900/90 text-white text-xs font-medium py-1.5 px-3 shadow-xl backdrop-blur-md border border-white/10 transition-opacity duration-150 ${positionClasses} ${className}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
