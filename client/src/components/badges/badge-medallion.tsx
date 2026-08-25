// A single badge visual: an uploaded image, or an emoji on a colored medallion.
export default function BadgeMedallion({
  emoji, imageDataUri, color, name, size = 56,
}: {
  emoji?: string | null;
  imageDataUri?: string | null;
  color?: string | null;
  name: string;
  size?: number;
}) {
  const ring = color || "#7c3aed";
  return (
    <div
      title={name}
      style={{ width: size, height: size }}
      className="rounded-full flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
    >
      {imageDataUri ? (
        <img src={imageDataUri} alt={name} className="w-full h-full object-cover rounded-full" style={{ boxShadow: `0 0 0 3px ${ring}` }} />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center"
          style={{ background: `radial-gradient(circle at 50% 35%, ${ring}22, ${ring}44), #fff`, boxShadow: `inset 0 0 0 3px ${ring}` }}
        >
          <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>{emoji || "🏅"}</span>
        </div>
      )}
    </div>
  );
}
