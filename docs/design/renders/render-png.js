// Renders an HTML file to PNG via headless Chromium, clipped to .stage.
// One-time setup (chromium auto-downloads to ~/.cache/puppeteer):
//   npm i puppeteer
// Usage: node render-png.js icons.html icons.png
const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const inFile = process.argv[2] || 'icons.html';
  const outFile = process.argv[3] || 'icons.png';
  const browser = await puppeteer.launch({ headless: 'new' });
  const pageObj = await browser.newPage();
  await pageObj.setViewport({ width: 1240, height: 900, deviceScaleFactor: 2 });
  await pageObj.goto('file://' + path.join(__dirname, inFile), { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));
  const el = await pageObj.$('.stage');
  await el.screenshot({ path: path.join(__dirname, outFile) });
  await browser.close();
  console.log('wrote ' + outFile);
})();
