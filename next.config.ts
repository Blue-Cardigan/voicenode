import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next/Turbopack doesn't infer a parent directory
  // when this project is checked out inside another monorepo (e.g. via a
  // worktree alongside other pnpm-workspace.yaml files). Without this, the
  // `@/*` path alias resolves against the wrong root and the build fails.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
