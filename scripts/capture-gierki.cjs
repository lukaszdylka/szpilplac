/* Autentyczne screeny gier Szpilplacu, bez obrazów generowanych. */
const { chromium } = require("playwright");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const games = ["zeflik", "kopalnia", "na-wiyrch", "szlojder"];
const out = path.join(process.cwd(), "gierki", "screens");
fs.mkdirSync(out, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    for (const slug of games) {
      const context = await browser.newContext({
        viewport: { width: 1120, height: 740 },
        deviceScaleFactor: 1,
        reducedMotion: "reduce"
      });
      const page = await context.newPage();
      try {
        await page.goto("http://127.0.0.1:8765/minigra.html?g=" + slug, {waitUntil:"domcontentloaded",timeout:45000});
        await page.waitForFunction(() => document.getElementById("state")?.classList.contains("hidden"), null, {timeout:35000});
        const child = page.frameLocator("#gameFrame");
        // Uruchom grę przez jej realny interfejs, jeśli widoczny jest przycisk startu.
        const buttons = child.locator('button, [role="button"], a');
        const count = Math.min(await buttons.count(), 70);
        let clicked = false;
        for (let i = 0; i < count; i++) {
          const b = buttons.nth(i);
          const label = ((await b.innerText().catch(() => "")) || "").trim();
          if (/^(gramy|graj|start|rozpocznij|szpilej|zagraj|play|leć|lecimy)$/i.test(label)
              && await b.isVisible().catch(() => false)) {
            await b.click({timeout:2000}).catch(() => {});
            clicked = true;
            break;
          }
        }
        if (!clicked) {
          // Bez klikania na ślepo: brak przycisku oznacza, że gra może działać od razu.
          console.log(slug + ": brak widocznego przycisku startu");
        }
        await page.waitForTimeout(900);
        const bytes = await page.locator("#gameFrame").screenshot({animations:"disabled",timeout:15000});
        await sharp(bytes).resize(960,600,{fit:"cover",position:"centre"}).webp({quality:84,effort:5}).toFile(path.join(out,slug+".webp"));
        console.log(slug+": zapisano prawdziwy zrzut rozgrywki");
      } finally {
        await context.close();
      }
    }
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode=1; });
