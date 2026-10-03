import { formatRateLabel, formatVolumeLabel, LABEL_STYLE } from './chartDataLabels';

// Recharts `label` renderers. Every renderer takes the Set of point indexes chosen by
// selectLabelIndexes()/selectLastIndex() so density is decided once, in tested logic.

export function HaloText({ x, y, children, fill, fontSize = 11, fontWeight = 700, textAnchor = 'middle', rotate = null }) {
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
      style={{ pointerEvents: 'none', fontVariantNumeric: 'tabular-nums' }}
    >
      {children}
    </text>
  );
}

/**
 * Label for a rate/percentage point on a Line or Area.
 * placement: 'above' (default) or 'below'; getFill(row, value) can recolour per point.
 */
export function renderRateLabel({ visible, rows = [], placement = 'above', fill = '#047857', getFill = null, fontSize = LABEL_STYLE.rateFontSize, digits = 2, text = null, offsetY = 0 }) {
  return function RateLabel(props) {
    const { x, y, value, index } = props;
    if (!visible?.has(index) || typeof x !== 'number' || typeof y !== 'number') return null;
    const label = text ? text(value, rows[index]) : formatRateLabel(value, digits);
    if (!label) return null;
    return (
      <HaloText
        x={x}
        y={(placement === 'below' ? y + fontSize + 7 : y - 10) + offsetY}
        fill={getFill ? getFill(rows[index], value) : fill}
        fontSize={fontSize}
      >
        {label}
      </HaloText>
    );
  };
}

/** Label for a volume bar; position/size rules come from LABEL_STYLE. */
export function renderVolumeBarLabel({ visible, textColor = '#FFFFFF', fontSize = LABEL_STYLE.volumeFontSize }) {
  return function VolumeBarLabel(props) {
    const { x, y, width, height, value, index } = props;
    if (!visible?.has(index) || typeof x !== 'number' || typeof y !== 'number') return null;
    const label = formatVolumeLabel(value);
    if (!label) return null;

    const centerX = x + width / 2;
    const fitsInside = height >= LABEL_STYLE.minBarHeightForInside;
    const inside = LABEL_STYLE.volumePosition === 'insideBottom' && fitsInside;

    if (!inside) {
      // Above the bar, in a dark colour with a halo so it is legible on the page background.
      return <HaloText x={centerX} y={y - 5} fill="#1E293B" fontSize={fontSize}>{label}</HaloText>;
    }
    if (width >= LABEL_STYLE.minBarWidthForHorizontal) {
      return (
        <text x={centerX} y={y + height - 7} fill={textColor} fontSize={fontSize} fontWeight={700} textAnchor="middle" style={{ pointerEvents: 'none', fontVariantNumeric: 'tabular-nums' }}>
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
        style={{ pointerEvents: 'none', fontVariantNumeric: 'tabular-nums' }}
      >
        {label}
      </text>
    );
  };
}
