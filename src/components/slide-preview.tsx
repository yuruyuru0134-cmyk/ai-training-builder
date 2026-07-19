import { TONE_ACCENT } from "@/lib/slide-theme";
import type { MaterialTone } from "@/lib/types";

// pptx出力（src/lib/slide-templates.ts）と構造を揃えたHTML版プレビュー。
// Canvaの参考テンプレートを踏襲し、左をアクセントカラーのソリッドパネル
// （白文字でH1/H2/H3）、右を写真パネルにする2分割レイアウト。文字を
// 写真の上に直接重ねないため、ぼかし・減光・グラデーション処理が不要になり、
// 写真側は常にクッキリ表示できる。
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

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {/* 左パネル: アクセントカラーのソリッド塗り。以降は全て白文字にすることで
          右側にどんな写真が来ても左側の可読性には一切影響しない。 */}
      <div
        className="relative flex w-[43%] shrink-0 flex-col justify-center gap-2.5 p-4"
        style={{ backgroundColor: accent }}
      >
        <span className="text-[8px] font-bold tracking-[0.15em] text-white/90">CHAPTER {no}</span>
        <p className="line-clamp-2 text-xl font-bold leading-snug text-white">{title}</p>
        <span className="h-0.5 w-5 bg-white/70" />
        {subtitle ? (
          <p className="line-clamp-2 text-[11px] font-semibold leading-relaxed text-white/95">{subtitle}</p>
        ) : null}
        {details.length > 0 ? (
          <ul className="space-y-1.5">
            {details.slice(0, 4).map((d, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[10px] leading-relaxed text-white/95">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/70" />
                <span className="line-clamp-1">{d}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[9px] text-white/70">詳細情報は台本の生成時に自動抽出されます。</p>
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
            <circle cx="990" cy="10" r="315" fill={accent} opacity={0.19} />
            <circle cx="990" cy="10" r="132" fill="none" stroke={accent} strokeWidth="1.4" opacity={0.58} />
            <circle cx="990" cy="10" r="198" fill="none" stroke={accent} strokeWidth="1.1" opacity={0.48} />
            <circle cx="990" cy="10" r="255" fill="none" stroke={accent} strokeWidth="0.9" opacity={0.38} />
            <circle cx="-100" cy="483" r="220" fill={accent} opacity={0.15} />
            <rect x="6" y="6" width="988" height="551" fill="none" stroke={accent} strokeWidth="0.7" opacity={0.25} />
          </svg>
        )}

        {/* 右パネル下部: 台本から抽出した手順のフローチャート（枠線つきの箱＋矢印）。
            写真の上半分は遮らず、下側だけに重ねる。 */}
        {flowSteps && flowSteps.length > 0 ? (
          <ol className="absolute inset-x-3 bottom-2 space-y-1">
            {flowSteps.slice(0, 5).map((step, i) => (
              <li key={i}>
                <div
                  className="rounded border bg-white/95 px-1.5 py-1 text-center text-[9px] font-bold leading-tight shadow-sm"
                  style={{ borderColor: accent, color: "#333333" }}
                >
                  <span className="line-clamp-1">{step}</span>
                </div>
                {i < flowSteps.slice(0, 5).length - 1 ? (
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
