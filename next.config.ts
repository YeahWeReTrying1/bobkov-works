import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const githubPagesBasePath = "/bobkov-works";

const nextConfig: NextConfig = {
  ...(isGithubPages
    ? {
        output: "export" as const,
        basePath: githubPagesBasePath,
        assetPrefix: githubPagesBasePath,
        trailingSlash: true,
        images: {
          unoptimized: true
        },
        env: {
          NEXT_PUBLIC_BASE_PATH: githubPagesBasePath
        }
      }
    : {}),
  outputFileTracingExcludes: {
    /* Медиа в public/uploads не должны попадать в serverless-бандлы (лимит 250 MB на Vercel).
       Сама папка public по-прежнему деплоится как статика. */
    "/*": ["./public/uploads/**/*"],
  },
};

export default nextConfig;
