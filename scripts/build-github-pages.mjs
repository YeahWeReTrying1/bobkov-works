import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const apiDir = path.join(root, "src", "app", "api");
const disabledSuffix = ".pages-disabled";

async function collectRouteFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectRouteFiles(full)));
    } else if (entry.isFile() && entry.name === "route.ts") {
      out.push(full);
    }
  }
  return out;
}

async function runNextBuild() {
  const command = process.platform === "win32" ? "npx.cmd next build" : "npx";
  const args = process.platform === "win32" ? [] : ["next", "build"];
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      GITHUB_PAGES: "true"
    }
  });

  return new Promise((resolve) => {
    child.on("close", resolve);
  });
}

const movedRoutes = [];

try {
  for (const routeFile of await collectRouteFiles(apiDir)) {
    const disabled = `${routeFile}${disabledSuffix}`;
    if (existsSync(disabled)) {
      await fs.rm(disabled, { force: true });
    }
    await fs.rename(routeFile, disabled);
    movedRoutes.push([routeFile, disabled]);
  }

  const code = await runNextBuild();
  process.exitCode = typeof code === "number" ? code : 1;
} finally {
  for (const [routeFile, disabled] of movedRoutes.reverse()) {
    if (existsSync(disabled)) {
      await fs.rename(disabled, routeFile);
    }
  }
}
