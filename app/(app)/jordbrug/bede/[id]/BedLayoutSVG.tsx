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
  const fullVw = lCm + PAD * 2;
  const vh = wCm + PAD * 2 + LABEL_H;

  // When previewing a zone, zoom the viewBox in on that zone (+0.5m context on each side)
  // so the illustration doesn't need to render the entire bed length.
  const vbX = highlightZone
    ? Math.max(0, PAD + highlightZone.offsetM * 100 - 50)
    : 0;
  const vbW = highlightZone
    ? Math.min(fullVw - vbX, (highlightZone.zoneLengthM + 1) * 100 + PAD * 2)
    : fullVw;

  const displayH = Math.max(Math.round(wCm * 0.9) + LABEL_H + PAD * 2, 80);
  const displayW = Math.max(Math.round(vbW * displayH / vh), 280);

  const allZones = highlightZone
    ? [...zones.filter(z => z.id !== highlightZone.id), highlightZone]
    : zones;

  return (
    <div style={{ overflowX: "auto", overflowY: "hidden", borderRadius: "10px" }}>
      <svg
        viewBox={`${vbX} 0 ${vbW} ${vh}`}
        width={displayW}
        height={displayH}
        style={{ display: "block" }}
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
