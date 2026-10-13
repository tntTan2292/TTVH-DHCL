import { Children, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Flyout of a collapsed sidebar group. The panel is rendered through a portal so the
// sidebar <nav> (overflow hidden) cannot clip it. First child = trigger, the rest = panel.
export default function CollapsedFlyout({ children }) {
  const [trigger, ...panel] = Children.toArray(children);
  const [pos, setPos] = useState(null);
  const wrapRef = useRef(null);
  const closeTimer = useRef(null);

  const open = () => {
    clearTimeout(closeTimer.current);
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const maxTop = Math.max(8, window.innerHeight - 440);
    setPos({ left: rect.right, top: Math.min(Math.max(8, rect.top), maxTop) });
  };
  const close = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setPos(null), 120);
  };

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  return (
    <div ref={wrapRef} className="relative group/collapsed" onMouseEnter={open} onMouseLeave={close}>
      {trigger}
      {pos &&
        createPortal(
          <div
            style={{ position: 'fixed', left: pos.left, top: pos.top, paddingLeft: 8 }}
            className="z-[100]"
            onMouseEnter={open}
            onMouseLeave={close}
          >
            <div className="min-w-[240px] max-w-[280px] rounded-2xl glass-sidebar border border-white/20 p-2 shadow-2xl backdrop-blur-2xl">
              {panel}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
