import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pptxgenjsはNode.js固有の処理を含み、Server Componentsバンドラーに
  // 自動でバンドルさせるとビルドエラーになりうるため明示的に除外する。
  serverExternalPackages: ["pptxgenjs"],
};

export default nextConfig;
