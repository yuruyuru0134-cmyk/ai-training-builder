import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  crons: [
    // Supabase Freeプランの7日間無操作による自動一時停止を防ぐため、
    // 週1回 /api/cron/keep-alive を呼び出す。
    { path: "/api/cron/keep-alive", schedule: "0 0 * * 0" },
  ],
};
