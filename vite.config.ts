import { defineConfig } from "vite";

export default defineConfig({
  server: { host: "0.0.0.0", proxy: { "/api": "http://127.0.0.1:8787" } },
  build: {
    rollupOptions: {
      input: {
        game: "index.html",
        marching: "marching.html",
        uniform: "uniform.html",
        music: "music.html",
      },
    },
  },
});
