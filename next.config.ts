import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pptxgenjs・sharpはNode.js固有の処理（sharpはネイティブバイナリ）を含み、
  // Server Componentsバンドラーに自動でバンドルさせるとビルドエラーや
  // 実行時エラーになりうるため明示的に除外する。
  serverExternalPackages: ["pptxgenjs", "sharp"],
};

export default nextConfig;
