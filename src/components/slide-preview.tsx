import { TONE_ACCENT } from "@/lib/slide-theme";
import type { MaterialTone } from "@/lib/types";

type TextTheme = {
  bgColor: string;
  h1Color: string;
  h3Color: string;
  captionColor: string;
};

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const THEME: Record<MaterialTone, TextTheme> = {
  business: { bgColor: "#F7F9FC", h1Color: "#1A1A1A", h3Color: "#444444", captionColor: "" },
  casual: { bgColor: "#FFF7E8", h1Color: "#3A2C14", h3Color: "#6B5A3C", captionColor: "" },
  minimal: { bgColor: "#FFFFFF", h1Color: "#1A1A1A", h3Color: "#555555", captionColor: "#888888" },
};

// pptx出力（src/lib/slide-templates.ts）と構造を揃えたHTML版プレビュー。
// H1(タイトル)→H2(サブタイトル)→H3(詳細情報)の文字の強弱で構成する。
// imageUrlが指定された場合はAI生成した背景画像（既に半透明に加工済み）を
// 敷き、無い場合はベクター背景装飾（同心円・サンバースト・フレーム）を使う。
export function SlidePreview({
  tone,
  chapterNo,
  title,
  subtitle,
  details,
  flowSteps,
  imageUrl,
}: {
  tone: MaterialTone;
  chapterNo: number;
  title: string;
  subtitle: string;
  details: string[];
  flowSteps?: string[];
  imageUrl?: string | null;
}) {
  const accent = `#${TONE_ACCENT[tone]}`;
  const no = String(chapterNo).padStart(2, "0");
  const theme = THEME[tone];
  const captionColor = theme.captionColor || accent;

  return (
    <div
      className="relative flex h-full w-full flex-col justify-center gap-4 overflow-hidden p-5"
      style={{ backgroundColor: theme.bgColor }}
    >
      {imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- 外部Storageの動的URLのため */}
          <img
            src={imageUrl}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          {/* タイトル・サブタイトルの視認性を保つためのスクリム（pptx側と同じ考え方） */}
          <span
            className="pointer-events-none absolute inset-x-0 top-0 h-[55%]"
            style={{ backgroundColor: theme.bgColor, opacity: 0.75 }}
          />
        </>
      ) : (
        // pptx出力（src/lib/slide-backgrounds/soft-circles.ts）と同じ構図をSVGで
        // 再現した背景装飾。ワイヤーフレーム球体風の同心円・放射状のサンバースト・
        // 外枠のフレームボーダーで①の視覚言語に寄せている。
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 1000 563"
          preserveAspectRatio="none"
        >
          <circle cx="990" cy="10" r="315" fill={accent} opacity={0.19} />
          <circle cx="990" cy="10" r="132" fill="none" stroke={accent} strokeWidth="1.4" opacity={0.58} />
          <circle cx="990" cy="10" r="198" fill="none" stroke={accent} strokeWidth="1.1" opacity={0.48} />
          <circle cx="990" cy="10" r="255" fill="none" stroke={accent} strokeWidth="0.9" opacity={0.38} />
          <circle cx="990" cy="10" r="303" fill="none" stroke={accent} strokeWidth="0.9" opacity={0.28} />
          <circle cx="-100" cy="483" r="220" fill={accent} opacity={0.15} />
          {(() => {
            const cx = 940, cy = 483, inner = 13;
            const tiers = [
              { outer: 64, opacity: 0.68 },
              { outer: 52, opacity: 0.55 },
              { outer: 40, opacity: 0.42 },
            ];
            return Array.from({ length: 36 }).map((_, i) => {
              const angle = (i / 36) * Math.PI * 2;
              const tier = tiers[i % tiers.length];
              return (
                <line
                  key={i}
                  x1={cx + inner * Math.cos(angle)}
                  y1={cy + inner * Math.sin(angle)}
                  x2={cx + tier.outer * Math.cos(angle)}
                  y2={cy + tier.outer * Math.sin(angle)}
                  stroke={accent}
                  strokeWidth={0.9}
                  strokeLinecap="round"
                  opacity={tier.opacity}
                />
              );
            });
          })()}
          <circle cx="940" cy="483" r="13" fill="none" stroke={accent} strokeWidth="0.9" opacity={0.55} />
          <rect x="6" y="6" width="988" height="551" fill="none" stroke={accent} strokeWidth="0.7" opacity={0.25} />
          <rect x="10.5" y="10.5" width="979" height="542" fill="none" stroke={accent} strokeWidth="0.9" opacity={0.42} />
        </svg>
      )}

      <span className="relative text-[9px] font-bold tracking-[0.15em]" style={{ color: captionColor }}>
        CHAPTER {no}
      </span>
      <p className="relative line-clamp-2 text-2xl font-bold leading-snug" style={{ color: theme.h1Color }}>
        {title}
      </p>
      <span className="relative h-0.5 w-6" style={{ backgroundColor: accent }} />
      {subtitle ? (
        <p className="relative line-clamp-2 text-sm font-semibold leading-relaxed" style={{ color: accent }}>
          {subtitle}
        </p>
      ) : null}
      <div className="relative flex gap-3">
        {/* 左カラム: H3詳細情報。フローチャートと並べるため右カラムより狭くする
            （pptx側src/lib/slide-templates.tsのLEFT_COL_Wと同じ考え方）。 */}
        <div className="w-[55%] shrink-0">
          {details.length > 0 ? (
            <ul className="space-y-2">
              {details.slice(0, 4).map((d, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 rounded-md px-2 py-1 text-[11px] leading-relaxed"
                  style={
                    imageUrl
                      ? {
                          // ハイライトは行全体を均一に塗らず、文字が収まる手前までは
                          // 不透明、そこから先はグラデーションで透明に消えていく
                          // （pptx側src/lib/slide-templates.tsと同じ考え方）。
                          backgroundImage: `linear-gradient(to right, ${hexToRgba(theme.bgColor, 0.92)} 0%, ${hexToRgba(theme.bgColor, 0.92)} 45%, ${hexToRgba(theme.bgColor, 0)} 85%)`,
                          color: theme.h3Color,
                        }
                      : { color: theme.h3Color }
                  }
                >
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
                  <span className="line-clamp-1">{d}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[10px] text-muted-foreground">詳細情報は台本の生成時に自動抽出されます。</p>
          )}
        </div>

        {/* 右カラム: 台本から抽出した手順を、枠線つきの箱＋矢印のフローチャートで
            表示する（pptx側src/lib/slide-templates.tsと同じ見た目）。 */}
        {flowSteps && flowSteps.length > 0 ? (
          <ol className="flex-1">
            {flowSteps.slice(0, 5).map((step, i) => (
              <li key={i}>
                <div
                  className="rounded-md border px-2 py-1.5 text-center text-[10px] font-bold leading-tight shadow-sm"
                  style={{
                    borderColor: accent,
                    backgroundColor: imageUrl ? hexToRgba(theme.bgColor, 0.95) : hexToRgba(theme.bgColor, 0.85),
                    color: theme.h3Color,
                  }}
                >
                  <span className="line-clamp-1">{step}</span>
                </div>
                {i < flowSteps.slice(0, 5).length - 1 ? (
                  <div className="flex justify-center py-0.5 text-[9px] leading-none" style={{ color: accent }}>
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
