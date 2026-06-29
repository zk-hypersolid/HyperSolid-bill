import React, { useMemo } from "react";
import Svg, { Rect, Path } from "react-native-svg";
import { toQR } from "toqr";

/** Build a single SVG path of all dark modules for a QR of `value`. Returns side count + path data. */
export function qrPath(value: string, cell = 1): { side: number; d: string } {
  const m = toQR(value);
  const side = Math.round(Math.sqrt(m.length));
  let d = "";
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      if (m[y * side + x]) d += `M${x * cell},${y * cell}h${cell}v${cell}h-${cell}z`;
    }
  }
  return { side, d };
}

/** Renders `value` as a QR code (square). Light background + dark modules; sized by `size` px. */
export function QrCode({ value, size = 160, color, bg }: { value: string; size?: number; color: string; bg: string }) {
  const { side, d } = useMemo(() => qrPath(value), [value]);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${side} ${side}`} testID="qr-code">
      <Rect x={0} y={0} width={side} height={side} fill={bg} />
      <Path d={d} fill={color} />
    </Svg>
  );
}
