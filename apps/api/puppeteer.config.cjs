/**
 * Puppeteer cache: on Render only, use project directory (Render has no $HOME/.cache).
 * Locally, leave cacheDirectory unset so Puppeteer uses the default and finds Chromium.
 */
const { join } = require("path");

/** @type {import("puppeteer").Configuration} */
module.exports = {
  ...(process.env.RENDER && { cacheDirectory: join(__dirname, ".cache", "puppeteer") }),
};
