/**
 * Puppeteer cache config. On Render, $HOME/.cache isn't available,
 * so we use a project-local cache. Locally, use the default cache.
 */
const { join } = require("path");

/** @type {import("puppeteer").Configuration} */
module.exports = {
  cacheDirectory: process.env.RENDER
    ? join(__dirname, ".cache", "puppeteer")
    : undefined,
};
