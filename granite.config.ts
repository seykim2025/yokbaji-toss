import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "yokbaji",
  brand: {
    displayName: "욕바지",
    primaryColor: "#3182f6",
    icon: "https://yokbaji-toss.vercel.app/favicon.svg",
  },
  web: {
    host: "10.1.1.16",
    port: 5173,
    commands: {
      dev: "vite --host",
      build: "tsc -b && vite build --mode ait",
    },
  },
  outdir: "dist",
  permissions: [
    { name: "photos", access: "read" },
  ],
  webViewProps: {
    type: "partner",
    // @ts-expect-error - undocumented Toss navigationBarHidden prop
    navigationBarHidden: true,
    bounces: false,
    pullToRefreshEnabled: false,
    overScrollMode: "never",
    allowsBackForwardNavigationGestures: false,
    mediaPlaybackRequiresUserAction: false,
    allowsInlineMediaPlayback: true,
  },
});
