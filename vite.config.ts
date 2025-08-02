import { rmSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-electron-plugin";
import { customStart, loadViteEnv } from "vite-electron-plugin/plugin";
// import basicSsl from '@vitejs/plugin-basic-ssl'
import pkg from "./package.json";
import legacy from "@vitejs/plugin-legacy";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// import visualizer from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isWebOnly = process.env.VITE_APP_WEB_ONLY === 'true';
  const isDev = mode === 'development' || process.env.NODE_ENV === 'development';
  
  if (!isWebOnly) {
    rmSync("dist-electron", { recursive: true, force: true });
  }

  const sourcemap = command === "serve" || !!process.env.VSCODE_DEBUG;

  return {
    resolve: {
      alias: {
        "@": path.join(__dirname, "src"),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ["legacy-js-api"],
        },
      },
    },
    plugins: [
      react(),
      // 只在非 Web 模式下加载 Electron 插件
      ...(!isWebOnly ? [
        electron({
          include: ["electron"],
          transformOptions: {
            sourcemap,
          },
          plugins: [
            ...(!!process.env.VSCODE_DEBUG
                ? [
                  // Will start Electron via VSCode Debug
                  customStart(() =>
                      console.log(
                          /* For `.vscode/.debug.script.mjs` */ "[startup] Electron App",
                      ),
                  ),
                ]
                : []),
            // Allow use `import.meta.env.VITE_SOME_KEY` in Electron-Main
            loadViteEnv(),
          ],
        })
      ] : []),
      // legacy({
      //   targets: ["defaults", "not IE 11"],
      // }),
      // visualizer({ open: true }),
    ],
    server: {
      ...(!!process.env.VSCODE_DEBUG
          ? (() => {
            const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL);
            return {
              host: url.hostname,
              port: +url.port,
            };
          })()
          : {}),
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      proxy: {
        '/openIM.wasm': {
          target: 'http://127.0.0.1:9999',
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('proxyRes', (proxyRes, req, res) => {
              proxyRes.headers['content-type'] = 'application/wasm';
              delete proxyRes.headers['content-encoding'];
              delete proxyRes.headers['content-disposition'];
              delete proxyRes.headers['content-length'];
              proxyRes.headers['access-control-allow-origin'] = '*';
              proxyRes.headers['access-control-allow-methods'] = 'GET, OPTIONS';
              proxyRes.headers['access-control-allow-headers'] = 'Content-Type';
              proxyRes.headers['cache-control'] = 'no-cache';
            });
          },
        },
       
      },
    },
    optimizeDeps: {
      exclude: ["@openim/wasm-client-sdk"],
    },
    clearScreen: false,
    build: {
      target: "es2022",
      sourcemap: isDev, // 开发环境开启sourcemap便于调试
      cssCodeSplit: true,
      chunkSizeWarningLimit: 500,
      minify: 'terser',
      terserOptions: {
        compress: {
          // 🔥 关键修改：开发环境保留console.log
          drop_console: !isDev, // 只在生产环境移除console.log
          drop_debugger: !isDev, // 只在生产环境移除debugger
        },
      },
      rollupOptions: {
        output: {
          // 对所有文件（包括worker）应用terser压缩
          manualChunks: undefined,
        },
        plugins: [
          // 🔥 修改worker处理：开发环境保留console
          {
            name: 'worker-console-handler',
            generateBundle(options, bundle) {
              // 只在生产环境对worker文件移除console
              if (!isDev) {
                Object.keys(bundle).forEach(fileName => {
                  const chunk = bundle[fileName];
                  if (chunk.type === 'chunk' && fileName.includes('worker')) {
                    // 对worker文件进行额外的console移除
                    chunk.code = chunk.code
                      .replace(/console\.(log|error|warn|info|debug)\([^)]*\);?/g, '')
                      .replace(/console\.(log|error|warn|info|debug)\([^)]*\)/g, 'void 0');
                  }
                });
              }
            }
          }
        ]
      },
    },
  };
});
