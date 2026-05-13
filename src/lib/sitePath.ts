const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function withBasePath(src: string): string {
  if (!src || !src.startsWith("/")) return src;
  if (/^\/\//.test(src)) return src;
  if (basePath && src.startsWith(`${basePath}/`)) return src;
  return `${basePath}${src}`;
}
