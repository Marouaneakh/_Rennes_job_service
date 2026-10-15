import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await chromium.launch({executablePath,headless:true});
const base = process.env.SITE_URL || 'http://localhost:3000';
const pages = ['index.html','a-propos.html','espace-etudiant.html','espace-entreprise.html','confidentialite.html'];
const widths = [390,768,1440];
await mkdir('artifacts',{recursive:true});
try {
  for (const width of widths) {
    const context = await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    for (const file of pages) {
      const page = await context.newPage();
      const errors=[]; page.on('pageerror',error=>errors.push(error.message));
      const response=await page.goto(`${base}/${file}`,{waitUntil:'networkidle'});
      const data=await page.evaluate(() => ({documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,title:document.title,h1:document.querySelector('h1')?.textContent.trim(),links:[...document.querySelectorAll('.site-nav a')].length}));
      if (response.status()!==200 || errors.length || data.documentWidth>data.viewportWidth+1 || !data.h1 || data.links<4) throw new Error(`${width}px ${file}: ${JSON.stringify({status:response.status(),errors,...data})}`);
      if (file==='index.html' && (width===390 || width===1440)) await page.screenshot({path:`artifacts/home-${width}.png`,fullPage:true});
      if (width===390 && file==='espace-etudiant.html') await page.screenshot({path:'artifacts/student-mobile.png',fullPage:true});
      if (width===390) { const menu=page.locator('.menu-toggle'); await menu.click(); await page.locator('.site-nav').waitFor({state:'visible'}); if (await menu.getAttribute('aria-expanded')!=='true') throw new Error(`menu mobile ${file}`); await page.keyboard.press('Escape'); if (await menu.getAttribute('aria-expanded')!=='false') throw new Error(`menu escape ${file}`); }
      console.log(`OK ${width}px ${file}`); await page.close();
    }
    await context.close();
  }
  const context = await browser.newContext({viewport:{width:390,height:850},reducedMotion:'reduce'});
  const student = await context.newPage();
  await student.goto(`${base}/espace-etudiant.html`);
  await student.locator('.submit-button').click();
  if (!await student.locator('.form-status.error').isVisible()) throw new Error('La validation du formulaire étudiant ne s’affiche pas.');
  await student.locator('#student-name').fill('Camille Martin');
  await student.locator('#student-email').fill('camille@example.com');
  await student.locator('#student-message').fill('Je cherche une mission de développement web.');
  await student.locator('#student-cv').setInputFiles({name:'CV.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n%%EOF\n')});
  await student.locator('input[name=consent]').check();
  await student.locator('.submit-button').click();
  await student.locator('.form-status.error').waitFor({state:'visible'});
  if (await student.locator('.form-status.success').count()) throw new Error('Faux succès quand SMTP est absent.');
  console.log('OK formulaire étudiant : validation et erreur SMTP visibles');
  const business = await context.newPage();
  await business.goto(`${base}/espace-entreprise.html`);
  await business.locator('#business-company').fill('Entreprise Exemple');
  await business.locator('#business-name').fill('Alex Martin');
  await business.locator('#business-email').fill('alex@example.com');
  await business.locator('#business-service').selectOption({label:'Inventaire'});
  await business.locator('#business-timing').fill('Novembre');
  await business.locator('#business-details').fill('Inventaire de notre magasin à Rennes.');
  await business.locator('input[name=consent]').check();
  await business.locator('.submit-button').click();
  await business.locator('.form-status.error').waitFor({state:'visible'});
  if (await business.locator('.form-status.success').count()) throw new Error('Faux succès quand SMTP est absent.');
  console.log('OK formulaire entreprise : erreur SMTP visible');
  await context.close();
} finally { await browser.close(); }
