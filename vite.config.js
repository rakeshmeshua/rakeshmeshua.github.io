import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// VITE_BASE is set by the GitHub Pages workflow (e.g. "/my-repo/"); locally it stays "/".
export default defineConfig({ base: process.env.VITE_BASE || "/", plugins: [react()] });
