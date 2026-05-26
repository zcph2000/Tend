import { calcLayout, zoneColor, type PlantingZone } from "@/lib/bedPlantingLayout";

const PAD = 8;        // viewBox padding (cm-units)
const LABEL_H = 22;   // height reserved for zone labels above the bed

export default function BedLayoutSVG({
  bedLengthM,
  bedWidthM,
  zones,
  highlightZone,
}: {
  bedLengthM: number;
  bedWidthM: number;
  zones: PlantingZone[];
  highlightZone?: PlantingZone | null; // preview for the form
}) {
  const lCm = bedLengthM * 100;
  const wCm = bedWidthM * 100;
  const vw = lCm + PAD * 2;
  const vh = wCm + PAD * 2 + LABEL_H;

  const allZones = highlightZone
    ? [...zones.filter(z => z.id !== highlightZone.id), highlightZone]
    : zones;

  return (
    <div style={{ borderRadius: "10px", overflow: "hidden" }}>
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {/* Bed background */}
        <rect
          x={PAD} y={PAD + LABEL_H}
          width={lCm} height={wCm}
          rx={4} fill="#1e2a14" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5}
        />

        {/* N/S end markers */}
        <text x={PAD + 4} y={PAD + LABEL_H - 4} fontSize={9} fill="rgba(255,255,255,0.25)">Nord</text>
        <text x={PAD + lCm - 4} y={PAD + LABEL_H - 4} fontSize={9} fill="rgba(255,255,255,0.25)" textAnchor="end">Syd</text>

        {allZones.map((zone) => {
          const color = zoneColor(zone.family);
          const isHighlight = zone === highlightZone;
          const xOffset = PAD + zone.offsetM * 100;
          const zw = Math.min(zone.zoneLengthM * 100, lCm - zone.offsetM * 100);
          if (zw <= 0) return null;

          const layout = calcLayout(bedWidthM, zone);

          return (
            <g key={zone.id}>
              <title>
                {zone.cropName}{zone.varietyName ? ` · ${zone.varietyName}` : ""}
                {zone.rowSpacingCm ? `\nRækkeafstand: ${zone.rowSpacingCm} cm` : ""}
                {zone.plantSpacingCm ? `\nPlanteafstand: ${zone.plantSpacingCm} cm` : ""}
              </title>
              {/* Zone fill */}
              <rect
                x={xOffset} y={PAD + LABEL_H}
                width={zw} height={wCm}
                fill={color} opacity={isHighlight ? 0.35 : 0.2}
                rx={2}
              />
              {/* Left border */}
              <line
                x1={xOffset} y1={PAD + LABEL_H}
                x2={xOffset} y2={PAD + LABEL_H + wCm}
                stroke={color} strokeWidth={1.5} opacity={0.7}
              />

              {/* Zone label (above bed) */}
              <text
                x={xOffset + 4}
                y={PAD + LABEL_H - 4}
                fontSize={9}
                fill={color}
                fontWeight="600"
              >
                {zone.cropName}{zone.varietyName ? ` · ${zone.varietyName}` : ""}
              </text>

              {/* Spacing label — bottom of zone */}
              {zone.rowSpacingCm && zone.plantSpacingCm && zw >= 40 && (
                <text
                  x={xOffset + zw / 2}
                  y={PAD + LABEL_H + wCm - 4}
                  fontSize={7}
                  fill={color}
                  opacity={0.55}
                  textAnchor="middle"
                >
                  {zone.rowSpacingCm}×{zone.plantSpacingCm}
                </text>
              )}

              {/* Plant dots */}
              {layout.positions.map(({ xM, yM }, i) => {
                const dotR = Math.min(
                  (zone.rowSpacingCm ?? 40) * 0.28,
                  (zone.plantSpacingCm ?? 25) * 0.28,
                  7
                );
                return (
                  <circle
                    key={i}
                    cx={xOffset + xM * 100}
                    cy={PAD + LABEL_H + yM * 100}
                    r={dotR}
                    fill={color}
                    opacity={0.85}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Row markers along the edge (every meter) */}
        {Array.from({ length: Math.floor(bedLengthM) + 1 }, (_, i) => (
          <g key={i}>
            <line
              x1={PAD + i * 100} y1={PAD + LABEL_H + wCm}
              x2={PAD + i * 100} y2={PAD + LABEL_H + wCm + 5}
              stroke="rgba(255,255,255,0.2)" strokeWidth={1}
            />
            <text
              x={PAD + i * 100} y={PAD + LABEL_H + wCm + 13}
              fontSize={8} fill="rgba(255,255,255,0.25)" textAnchor="middle"
            >
              {i}m
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
