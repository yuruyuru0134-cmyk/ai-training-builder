// 操作画面用の装飾背景。黄→オレンジ→白→水色→オレンジ混じりの水色の
// グラデーションに、ゆっくり漂う3つの水玉を重ねる。
export function DecorativeBackground() {
  return (
    <div aria-hidden="true" className="decorative-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="decorative-bg-gradient absolute inset-0" />
      <div className="decorative-blob decorative-blob-1" />
      <div className="decorative-blob decorative-blob-2" />
      <div className="decorative-blob decorative-blob-3" />
    </div>
  );
}
