import { ImageResponse } from "next/og";

export const alt = "Orbit, a calm daily dashboard by Joseph Leung";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// A still of the default scene: night sky, rain, a lit skyline, the clock lockup.
export default function OpenGraphImage() {
  const windows = Array.from({ length: 22 }, (_, i) => i);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(180deg, #070b13 0%, #0c1424 62%, #111a2c 100%)",
          color: "#e9e4da",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 190,
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
            padding: "0 40px",
          }}
        >
          {windows.map((i) => (
            <div
              key={i}
              style={{
                width: 44,
                height: 70 + ((i * 37) % 120),
                background: "#0a101c",
                borderTop: "1px solid rgba(233,228,218,0.08)",
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                padding: 8,
              }}
            >
              {[0, 1, 2, 3].map((w) => (
                <div
                  key={w}
                  style={{
                    width: 6,
                    height: 6,
                    background: (i + w) % 3 === 0 ? "rgba(233,190,120,0.7)" : "transparent",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, color: "#8b93a5", fontFamily: "monospace" }}>
          ORBIT
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 300, lineHeight: 1 }}>20:32</div>
          <div style={{ display: "flex", fontSize: 44, marginTop: 28 }}>A calm daily dashboard</div>
          <div style={{ display: "flex", fontSize: 28, marginTop: 14, color: "#a9b0bf", fontFamily: "sans-serif" }}>
            Free, private, no account. By Joseph Leung.
          </div>
        </div>
        <div style={{ display: "flex", height: 150 }} />
      </div>
    ),
    size,
  );
}
