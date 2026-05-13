import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    /* Медиа в public/uploads не должны попадать в serverless-бандлы (лимит 250 MB на Vercel).
       Сама папка public по-прежнему деплоится как статика. */
    "/*": ["./public/uploads/**/*"],
  },
};

export default nextConfig;
