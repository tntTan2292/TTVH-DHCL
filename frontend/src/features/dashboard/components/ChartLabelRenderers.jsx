import { formatRateLabel, formatVolumeLabel, LABEL_STYLE } from './chartDataLabels';

// Recharts `label` renderers. Every renderer takes the Set of point indexes chosen by
// selectLabelIndexes()/selectLastIndex() so density is decided once, in tested logic.

export function HaloText({ x, y, children, fill, fontSize = 11, fontWeight = 700, textAnchor = 'middle', rotate = null, className = '' }) {
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      fontSize={fontSize}
      fontWeight={fontWeight}
      textAnchor={textAnchor}
      transform={rotate ? `rotate(${rotate}, ${x}, ${y})` : undefined}
      stroke={LABEL_STYLE.haloColor}
      strokeWidth={3}
      strokeLinejoin="round"
      paintOrder="stroke"
      className={className}
      style={{ pointerEvents: 'none', fontVariantNumeric: 'tabular-nums' }}
    >
      {children}
    </text>
  );
}

/**
 * Label for a rate/percentage point on a Line or Area.
 * placement: 'above' (default) or 'below' or function (row, value, index) => 'above' | 'below';
 * getFill(row, value) can recolour per point.
 */
export function renderRateLabel({ visible, rows = [], placement = 'above', fill = '#047857', getFill = null, fontSize = LABEL_STYLE.rateFontSize, digits = 2, text = null, offsetY = 0, className = '' }) {
  return function RateLabel(props) {
    const { x, y, value, index } = props;
    if (!visible?.has(index) || typeof x !== 'number' || typeof y !== 'number') return null;
    const label = text ? text(value, rows[index]) : formatRateLabel(value, digits);
    if (!label) return null;
    const row = rows[index];
    const actualPlacement = typeof placement === 'function' ? placement(row, value, index) : placement;
    const yPos = (actualPlacement === 'below' ? y + fontSize + 7 : y - 10) + offsetY;
    return (
      <HaloText
        x={x}
        y={yPos}
        fill={getFill ? getFill(row, value) : fill}
        fontSize={fontSize}
        className={className}
      >
        {label}
      </HaloText>
    );
  };
}

/** Label for a volume bar; position/size rules come from LABEL_STYLE. */
export function renderVolumeBarLabel({ visible, textColor = '#FFFFFF', fontSize = LABEL_STYLE.volumeFontSize, className = '' }) {
  return function VolumeBarLabel(props) {
    const { x, y, width, height, value, index } = props;
    if (!visible?.has(index) || typeof x !== 'number' || typeof y !== 'number') return null;
    const label = formatVolumeLabel(value);
    if (!label) return null;

    const centerX = x + width / 2;
    const isNarrow = width < LABEL_STYLE.minBarWidthForHorizontal;
    const minHeightNeeded = isNarrow
      ? Math.max(LABEL_STYLE.minBarHeightForInside, 40)
      : LABEL_STYLE.minBarHeightForInside;
    const fitsInside = height >= minHeightNeeded;
    const inside = LABEL_STYLE.volumePosition === 'insideBottom' && fitsInside;

    if (!inside) {
      // Above the bar, in a dark colour with a halo so it is legible on the page background.
      return <HaloText x={centerX} y={y - 5} fill="#1E293B" fontSize={fontSize} className={className}>{label}</HaloText>;
    }
    if (!isNarrow) {
      return (
        <text
          x={centerX}
          y={y + height - 7}
          fill={textColor}
          fontSize={fontSize}
          fontWeight={700}
          textAnchor="middle"
          className={className}
          style={{ pointerEvents: 'none', fontVariantNumeric: 'tabular-nums' }}
        >
          {label}
        </text>
      );
    }
    // Narrow bar: read bottom-to-top inside the bar.
    return (
      <text
        x={centerX + fontSize / 3}
        y={y + height - 6}
        fill={textColor}
        fontSize={fontSize}
        fontWeight={700}
        textAnchor="start"
        transform={`rotate(-90, ${centerX + fontSize / 3}, ${y + height - 6})`}
        className={className}
        style={{ pointerEvents: 'none', fontVariantNumeric: 'tabular-nums' }}
      >
        {label}
      </text>
    );
  };
}

/** Non-overlapping, halo-protected label for horizontal target lines (e.g. Mục tiêu 90%). */
export function ReferenceTargetLabel({ viewBox, value = 'Mục tiêu 90%' }) {
  if (!viewBox) return null;
  const { x, y } = viewBox;
  return (
    <HaloText
      x={x + 10}
      y={y - 7}
      fill="#DC2626"
      fontSize={11}
      fontWeight={700}
      textAnchor="start"
    >
      {value}
    </HaloText>
  );
}
