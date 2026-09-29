import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  functions: {
    mobadra: {
      name: "Mobadra Activity API",
      source: "./functions/mobadra.ts",
    },
  },
});
