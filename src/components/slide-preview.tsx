import { TONE_ACCENT } from "@/lib/slide-theme";
import type { MaterialTone } from "@/lib/types";
import type { BackgroundStyleKey } from "@/lib/slide-backgrounds";

// pptx側の各背景スタイル（src/lib/slide-backgrounds/配下）と視覚的な印象を
// 揃えたSVG版フォールバック。写真パネルの座標系（viewBox 0 0 1000 563）に
// 合わせて簡略化して再現している。
function BackgroundStyleSvg({ style, accent }: { style: BackgroundStyleKey; accent: string }) {
  switch (style) {
    case "gradient-cards": {
      const bandCount = 8;
      return (
        <>
          {Array.from({ length: bandCount }).map((_, i) => {
            const t = i / (bandCount - 1);
            return (
              <rect
                key={i}
                x={(1000 / bandCount) * i}
                y={0}
                width={1000 / bandCount + 2}
                height={563}
                fill={t < 0.5 ? "#3E6FF0" : "#8A4FE0"}
                opacity={0.15 + t * 0.15}
              />
            );
          })}
          <rect x={60} y={40} width={220} height={130} rx={14} fill="#FFFFFF" opacity={0.12} stroke="#FFFFFF" strokeOpacity={0.3} />
          <rect x={330} y={15} width={180} height={110} rx={14} fill="#FFFFFF" opacity={0.1} stroke="#FFFFFF" strokeOpacity={0.25} />
        </>
      );
    }
    case "color-grid": {
      const colors = ["#1F6F78", "#2E9E8F", "#F2B23E", "#1F3A5F", accent, "#2E9E8F"];
      const gx = 480, gy = 45, cw = 150, ch = 95, gap = 8;
      return (
        <>
          <rect x={0} y={0} width={1000} height={260} fill="#F4F1EA" />
          {colors.map((c, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            return (
              <rect
                key={i}
                x={gx + col * (cw + gap)}
                y={gy + row * (ch + gap)}
                width={cw}
                height={ch}
                fill={c}
              />
            );
          })}
        </>
      );
    }
    case "vintage-frame":
      return (
        <>
          <rect x={0} y={0} width={1000} height={563} fill="#F3ECE0" />
          <rect x={22} y={22} width={956} height={519} fill="none" stroke="#6B4A34" strokeWidth={1} strokeOpacity={0.35} />
          <rect x={30} y={30} width={940} height={503} fill="none" stroke="#6B4A34" strokeWidth={2} strokeOpacity={0.2} />
          <line x1={70} y1={78} x2={160} y2={78} stroke="#6B4A34" strokeWidth={1.5} strokeOpacity={0.4} />
          <circle cx={178} cy={78} r={4} fill="#6B4A34" opacity={0.4} />
        </>
      );
    case "soft-blobs": {
      const blob = (cx: number, cy: number, r: number, color: string) => (
        <>
          <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.16} />
          <circle cx={cx} cy={cy} r={r * 0.75} fill={color} opacity={0.14} />
          <circle cx={cx} cy={cy} r={r * 0.5} fill={color} opacity={0.13} />
        </>
      );
      return (
        <>
          {blob(280, 90, 155, "#9FD1F5")}
          {blob(760, 40, 130, "#F5B8DA")}
          {blob(600, 210, 110, "#CDB6F2")}
        </>
      );
    }
    case "line-art-dark":
      return (
        <>
          <rect x={0} y={0} width={1000} height={563} fill="#141414" />
          <polyline
            points="740,270 800,90 850,190 920,20"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={0.85}
            strokeWidth={1.5}
          />
          <circle cx={920} cy={20} r={3} fill="#FFFFFF" opacity={0.9} />
          <circle cx={430} cy={310} r={55} fill="none" stroke={accent} strokeOpacity={0.6} strokeWidth={1.5} />
        </>
      );
    case "none":
      return <rect x={0} y={0} width={1000} height={563} fill="#F7F9FC" />;
    case "soft-circles":
    default:
      return (
        <>
          <circle cx={990} cy={10} r={315} fill={accent} opacity={0.19} />
          <circle cx={990} cy={10} r={132} fill="none" stroke={accent} strokeWidth={1.4} opacity={0.58} />
          <circle cx={990} cy={10} r={198} fill="none" stroke={accent} strokeWidth={1.1} opacity={0.48} />
          <circle cx={990} cy={10} r={255} fill="none" stroke={accent} strokeWidth={0.9} opacity={0.38} />
          <circle cx={-100} cy={483} r={220} fill={accent} opacity={0.15} />
          <rect x={6} y={6} width={988} height={551} fill="none" stroke={accent} strokeWidth={0.7} opacity={0.25} />
        </>
      );
  }
}

// pptx出力（src/lib/slide-templates.ts）と構造を揃えたHTML版プレビュー。
// ただの「左ソリッドパネル＋右写真」の平凡な2分割にしないよう、
// (1) 左パネル上部を写真パネルへ食い込ませるノッチ、(2) そこに収める大きな
// 章番号のポスター的タイポグラフィ、という2点で独自性を持たせている。
// 手順フローチャートは「箱の中に文字、矢印でつなぐ」という一般的な見た目を
// 保つため、枠線つきボックスを縦の矢印でつないでいる。
// 文字を写真の上に直接重ねないため、ぼかし・減光・グラデーション処理は不要。
export function SlidePreview({
  tone,
  chapterNo,
  title,
  subtitle,
  details,
  flowSteps,
  imageUrl,
  backgroundStyle = "soft-circles",
}: {
  tone: MaterialTone;
  chapterNo: number;
  title: string;
  subtitle: string;
  details: string[];
  flowSteps?: string[];
  imageUrl?: string | null;
  backgroundStyle?: BackgroundStyleKey;
}) {
  const accent = `#${TONE_ACCENT[tone]}`;
  const no = String(chapterNo).padStart(2, "0");
  const steps = (flowSteps ?? []).slice(0, 5);

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {/* 左パネル: アクセントカラーのソリッド塗り。以降は全て白文字にすることで
          右側にどんな写真が来ても左側の可読性には一切影響しない。 */}
      <div
        className="relative flex w-[43%] shrink-0 flex-col justify-center gap-2.5 overflow-hidden p-4"
        style={{ backgroundColor: accent }}
      >
        {/* 右上のノッチ内に収める、大きく薄い章番号（ポスター的タイポグラフィ）。 */}
        <span
          className="pointer-events-none absolute -top-3 right-2 select-none text-[64px] font-black leading-none text-white/15"
          aria-hidden
        >
          {no}
        </span>
        <span className="relative text-[8px] font-bold tracking-[0.15em] text-white/90">CHAPTER</span>
        <p className="relative line-clamp-2 text-xl font-bold leading-snug text-white">{title}</p>
        <span className="relative h-0.5 w-5 bg-white/70" />
        {subtitle ? (
          <p className="relative line-clamp-2 text-[11px] font-semibold leading-relaxed text-white/95">{subtitle}</p>
        ) : null}
        {details.length > 0 ? (
          <ul className="relative space-y-1.5">
            {details.slice(0, 4).map((d, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[10px] leading-relaxed text-white/95">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/70" />
                <span className="line-clamp-1">{d}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="relative text-[9px] text-white/70">詳細情報は台本の生成時に自動抽出されます。</p>
        )}
      </div>

      {/* 右パネル: 背景画像があればそのまま鮮明に表示し、無い場合のみ
          ベクター背景装飾（同心円・サンバースト・フレーム）にフォールバックする。 */}
      <div className="relative flex-1">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 外部Storageの動的URLのため
          <img src={imageUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
        ) : (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 1000 563"
            preserveAspectRatio="none"
            style={{ backgroundColor: "#F7F9FC" }}
          >
            <BackgroundStyleSvg style={backgroundStyle} accent={accent} />
          </svg>
        )}

        {/* 右パネル下部: 台本から抽出した手順を、枠線つきボックス＋矢印という
            一般的なフローチャートの見た目で重ねる（pptx版と構造を揃える）。 */}
        {steps.length > 0 ? (
          <ol className="absolute inset-x-3 bottom-2 space-y-1">
            {steps.map((step, i) => (
              <li key={i}>
                <div
                  className="flex items-center gap-1.5 rounded border bg-white/95 px-1.5 py-1 shadow-sm"
                  style={{ borderColor: accent }}
                >
                  <span
                    className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[7px] font-bold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {i + 1}
                  </span>
                  <span className="line-clamp-1 text-[9px] font-bold leading-tight" style={{ color: "#333333" }}>
                    {step}
                  </span>
                </div>
                {i < steps.length - 1 ? (
                  <div className="flex justify-center text-[7px] leading-none" style={{ color: accent }}>
                    ▼
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}
