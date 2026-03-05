/**
 * Puppeteer cache: use project directory so Chromium is found on Render.
 * Render does not persist $HOME/.cache; this path is inside the service and survives build.
 * @see https://community.render.com/t/puppeteer-fails-to-find-chromium-on-render/9920
 */
const { join } = require("path");

/** @type {import("puppeteer").Configuration} */
module.exports = {
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};
