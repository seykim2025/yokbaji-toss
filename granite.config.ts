import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "yokbaji-toss",
  brand: {
    displayName: "욕바지",
    primaryColor: "#3182f6",
    icon: "https://yokbaji-toss.vercel.app/favicon.svg",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite",
      build: "tsc -b && vite build",
    },
  },
  outdir: "dist",
  permissions: [],
  webViewProps: {
    type: "game",
    bounces: false,
    pullToRefreshEnabled: false,
    overScrollMode: "never",
    allowsBackForwardNavigationGestures: false,
    mediaPlaybackRequiresUserAction: false,
  },
});
