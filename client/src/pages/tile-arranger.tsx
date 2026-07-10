// TILE ARRANGER — a dev tool to decipher a tileset's AUTOTILE arrangement without guessing.
// Load any tileset, it auto-detects each cell's 4-corner fill (the dual-grid / marching-squares
// mask TL=1 TR=2 BR=4 BL=8), lets you correct any cell→mask assignment, LIVE-PREVIEWS the autotiling
// on a test region, and outputs the DualMap you paste into a ring. Pairs with the packs' own
// guide_autotile_*.png. Route: /tile-arranger  (see [[cirqlback-autotiling-expertise]]).

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { loadImage, paintDualGrid, type DualMap } from "@/game/tile";

// Known tilesets to try (the ones that ship an autotile guide). Add any URL in the box.
const PRESETS: { label: string; url: string; cell: number }[] = [
  { label: "Desert ground (sanctumpixel)", url: "/packs/desert/tileset/ground_tile.png", cell: 16 },
  { label: "Desert wall/cliff (sanctumpixel)", url: "/packs/desert/tileset/wall_tile.png", cell: 16 },
  { label: "Forest ground (sanctumpixel)", url: "/packs/forest/tileset/tileset.png", cell: 16 },
  { label: "Snow ground (sanctumpixel)", url: "/packs/snow/tileset/tileset_snow.png", cell: 16 },
  { label: "Cute Fantasy cobble_blob", url: "/cute-fantasy/tiles/cobble_blob.png", cell: 16 },
  { label: "Cute Fantasy water_blob", url: "/cute-fantasy/tiles/water_blob.png", cell: 16 },
];

// A test region that exercises corners, straight edges, inner (concave) corners + a diagonal, so the
// preview reveals a wrong cell instantly. `true` = inside the region.
const TEST_W = 12, TEST_H = 9;
const TEST_REGION: boolean[][] = (() => {
  const g = Array.from({ length: TEST_H }, () => Array<boolean>(TEST_W).fill(false));
  const fill = (x0: number, y0: number, x1: number, y1: number) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = true; };
  fill(1, 1, 6, 6);          // a solid block (edges + convex corners)
  g[3][3] = g[3][4] = g[4][3] = g[4][4] = false;   // a hole in the middle (inner/concave corners)
  fill(7, 4, 10, 7);         // a second block overlapping diagonally (a bridge/diagonal case)
  g[2][8] = true;            // an isolated speck (all-corners-of-one cell)
  return g;
})();

const MASK_LABEL: Record<number, string> = { 0: "empty", 15: "solid", 1: "TL", 2: "TR", 4: "BR", 8: "BL", 3: "top", 12: "bottom", 9: "left", 6: "right", 5: "TL+BR", 10: "TR+BL", 7: "-BL", 11: "-BR", 13: "-TR", 14: "-TL" };

export default function TileArranger() {
  const [url, setUrl] = useState(PRESETS[0].url);
  const [cell, setCell] = useState(16);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [cols, setCols] = useState(0);
  const [rows, setRows] = useState(0);
  const [detected, setDetected] = useState<number[][]>([]);   // per-cell auto-detected mask
  const [map, setMap] = useState<DualMap>({});                 // mask → [col,row]
  const [sel, setSel] = useState<[number, number] | null>(null);   // selected cell
  const [zoom, setZoom] = useState(4);
  const sheetRef = useRef<HTMLCanvasElement>(null);
  const prevRef = useRef<HTMLCanvasElement>(null);

  // load + auto-detect corner masks
  useEffect(() => {
    let alive = true;
    loadImage(url).then((im) => {
      if (!alive) return;
      const c = Math.max(1, cell), cc = Math.floor(im.width / c), rr = Math.floor(im.height / c);
      const cv = document.createElement("canvas"); cv.width = im.width; cv.height = im.height;
      const x = cv.getContext("2d")!; x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, im.width, im.height).data, W = im.width;
      const quad = (col: number, row: number) => {
        const q = (qx: number, qy: number) => {
          let op = 0, tot = 0;
          for (let y = qy * (c / 2); y < qy * (c / 2) + c / 2; y++) for (let xx = qx * (c / 2); xx < qx * (c / 2) + c / 2; xx++) { tot++; if (d[((row * c + y) * W + (col * c + xx)) * 4 + 3] > 128) op++; }
          return op / tot > 0.5 ? 1 : 0;
        };
        return (q(0, 0) ? 1 : 0) | (q(1, 0) ? 2 : 0) | (q(1, 1) ? 4 : 0) | (q(0, 1) ? 8 : 0);   // TL,TR,BR,BL
      };
      const det: number[][] = [], m: DualMap = {};
      for (let r = 0; r < rr; r++) { det[r] = []; for (let co = 0; co < cc; co++) { const mk = quad(co, r); det[r][co] = mk; if (mk !== 0 && !(mk in m)) m[mk] = [co, r]; } }
      setImg(im); setCols(cc); setRows(rr); setDetected(det); setMap(m); setSel(null);
    }).catch(() => { setImg(null); });
    return () => { alive = false; };
  }, [url, cell]);

  // draw the tileset with grid + per-cell detected mask + selection
  useEffect(() => {
    const cv = sheetRef.current; if (!cv || !img) return;
    const c = cell, z = zoom; cv.width = cols * c * z; cv.height = rows * c * z;
    const x = cv.getContext("2d")!; x.imageSmoothingEnabled = false;
    x.clearRect(0, 0, cv.width, cv.height); x.drawImage(img, 0, 0, cols * c * z, rows * c * z);
    x.font = "bold 10px monospace"; x.textBaseline = "top";
    for (let r = 0; r < rows; r++) for (let co = 0; co < cols; co++) {
      x.strokeStyle = "rgba(0,255,255,.35)"; x.lineWidth = 1; x.strokeRect(co * c * z, r * c * z, c * z, c * z);
      const mk = detected[r]?.[co] ?? 0;
      if (mk) { x.fillStyle = "rgba(0,0,0,.6)"; x.fillRect(co * c * z, r * c * z, 22, 12); x.fillStyle = "#7fffd4"; x.fillText(String(mk), co * c * z + 2, r * c * z + 1); }
    }
    if (sel) { x.strokeStyle = "#ffd166"; x.lineWidth = 3; x.strokeRect(sel[0] * c * z, sel[1] * c * z, c * z, c * z); }
  }, [img, cols, rows, cell, zoom, detected, sel]);

  // draw the LIVE preview of the test region autotiled with the current map
  useEffect(() => {
    const cv = prevRef.current; if (!cv || !img) return;
    const c = cell, z = 5; cv.width = TEST_W * c * z; cv.height = TEST_H * c * z;
    const x = cv.getContext("2d")!; x.imageSmoothingEnabled = false;
    x.fillStyle = "#2a2f3a"; x.fillRect(0, 0, cv.width, cv.height);
    const inR = (wx: number, wy: number) => wy >= 0 && wy < TEST_H && wx >= 0 && wx < TEST_W && TEST_REGION[wy][wx];
    paintDualGrid(inR, 0, 0, TEST_W - 1, TEST_H - 1, map, (wx, wy, col, row) => {
      x.drawImage(img, col * c, row * c, c, c, wx * c * z, wy * c * z, c * z, c * z);
    });
    // faint region outline so you can compare
    x.strokeStyle = "rgba(255,255,255,.12)";
    for (let r = 0; r < TEST_H; r++) for (let co = 0; co < TEST_W; co++) if (TEST_REGION[r][co]) x.strokeRect(co * c * z, r * c * z, c * z, c * z);
  }, [img, cell, map]);

  const assign = (mask: number) => { if (sel) setMap((m) => ({ ...m, [mask]: [sel[0], sel[1]] })); };
  const clearMask = (mask: number) => setMap((m) => { const n = { ...m }; delete n[mask]; return n; });

  const output = useMemo(() => {
    const line = (a: number, b: number) => [a, b].map((mk) => (mk in map ? `0b${mk.toString(2).padStart(4, "0")}: [${map[mk][0]}, ${map[mk][1]}]` : `0b${mk.toString(2).padStart(4, "0")}: /*?*/`)).join(", ");
    return "const DUAL_MAP: DualMap = {\n" + [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15, 0]].map(([a, b]) => "  " + line(a, b) + ",").join("\n") + "\n};";
  }, [map]);

  const drawMini = (canvas: HTMLCanvasElement | null, cellPos?: [number, number]) => {
    if (!canvas || !img) return; const c = cell; canvas.width = c * 3; canvas.height = c * 3;
    const x = canvas.getContext("2d")!; x.imageSmoothingEnabled = false; x.clearRect(0, 0, c * 3, c * 3);
    if (cellPos) x.drawImage(img, cellPos[0] * c, cellPos[1] * c, c, c, 0, 0, c * 3, c * 3);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#12141c", color: "#dfe6f0", fontFamily: "Segoe UI, system-ui, sans-serif", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <Link href="/tile-lab"><a style={{ color: "#9fb3c8", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}><ArrowLeft size={16} /> Tile Lab</a></Link>
        <h1 style={{ fontSize: 18, margin: 0 }}>🧩 Sprite Arranger — autotile decoder</h1>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        <select value={url} onChange={(e) => { const p = PRESETS.find((p) => p.url === e.target.value); setUrl(e.target.value); if (p) setCell(p.cell); }} style={{ padding: 6, background: "#1c2029", color: "#dfe6f0", border: "1px solid #333", borderRadius: 6 }}>
          {PRESETS.map((p) => <option key={p.url} value={p.url}>{p.label}</option>)}
        </select>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…or any tileset URL" style={{ padding: 6, width: 320, background: "#1c2029", color: "#dfe6f0", border: "1px solid #333", borderRadius: 6 }} />
        <label>cell <input type="number" value={cell} onChange={(e) => setCell(+e.target.value || 16)} style={{ width: 54, padding: 6, background: "#1c2029", color: "#dfe6f0", border: "1px solid #333", borderRadius: 6 }} /></label>
        <label>zoom <input type="range" min={2} max={8} value={zoom} onChange={(e) => setZoom(+e.target.value)} /></label>
        <span style={{ color: "#8fa" }}>{img ? `${cols}×${rows} cells` : "loading…"}</span>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "#9fb3c8", marginBottom: 6 }}>Tileset — click a cell to select it, then click a mask below. (Number = auto-detected corner mask.)</div>
          <div style={{ maxHeight: "60vh", overflow: "auto", border: "1px solid #333", borderRadius: 8, background: "#0c0e14" }}>
            <canvas ref={sheetRef} onClick={(e) => {
              const cv = sheetRef.current!; const r = cv.getBoundingClientRect();
              const px = (e.clientX - r.left) * (cv.width / r.width), py = (e.clientY - r.top) * (cv.height / r.height);
              setSel([Math.floor(px / (cell * zoom)), Math.floor(py / (cell * zoom))]);
            }} style={{ display: "block", cursor: "pointer", imageRendering: "pixelated" }} />
          </div>
        </div>

        <div>
          <div style={{ color: "#9fb3c8", marginBottom: 6 }}>Live preview (test region autotiled with the map). Wrong cell → obvious seam.</div>
          <canvas ref={prevRef} style={{ border: "1px solid #333", borderRadius: 8, imageRendering: "pixelated", maxWidth: 380 }} />
          <div style={{ marginTop: 12, color: "#9fb3c8" }}>Selected cell: {sel ? `col ${sel[0]}, row ${sel[1]}` : "—"}</div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, maxWidth: 380 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0].map((mk) => (
              <div key={mk} onClick={() => assign(mk)} onContextMenu={(e) => { e.preventDefault(); clearMask(mk); }} title="click: assign selected cell · right-click: clear" style={{ border: mk in map ? "1px solid #7fffd4" : "1px dashed #556", borderRadius: 6, padding: 4, cursor: sel ? "pointer" : "default", background: "#171a22", fontSize: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#9fb3c8" }}><b>{mk}</b><span>{MASK_LABEL[mk] ?? ""}</span></div>
                {/* 2×2 corner glyph */}
                <div style={{ display: "grid", gridTemplateColumns: "8px 8px", gridTemplateRows: "8px 8px", gap: 1, margin: "3px 0" }}>
                  {[1, 2, 8, 4].map((bit) => <div key={bit} style={{ width: 8, height: 8, background: mk & bit ? "#c8a24a" : "#333", borderRadius: 1 }} />)}
                </div>
                <canvas ref={(el) => drawMini(el, map[mk])} style={{ width: 30, height: 30, imageRendering: "pixelated", background: "#0c0e14" }} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ color: "#9fb3c8", marginBottom: 6 }}>Output — paste this DualMap into the ring (missing masks fall back to solid). The `guide_autotile_*.png` that ships with a pack numbers the tiles 1–16 to confirm.</div>
          <textarea readOnly value={output} style={{ width: "100%", height: 260, background: "#0c0e14", color: "#a6e3a1", border: "1px solid #333", borderRadius: 8, padding: 10, fontFamily: "monospace", fontSize: 12 }} />
          <button onClick={() => navigator.clipboard?.writeText(output)} style={{ marginTop: 8, padding: "6px 12px", background: "#2a3550", color: "#dfe6f0", border: "1px solid #445", borderRadius: 6, cursor: "pointer" }}>Copy</button>
        </div>
      </div>
    </div>
  );
}
