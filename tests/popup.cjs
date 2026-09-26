const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname, '..');
const screenshots=process.argv.includes('--screenshots');
const screenshotPath=name=>path.join(root, 'docs/screenshots', name);
if(screenshots) fs.mkdirSync(path.join(root, 'docs/screenshots'),{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});
 try {
 const page=await browser.newPage({viewport:{width:300,height:600},deviceScaleFactor:2,colorScheme:'dark'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.fixture={enabled:JSON.parse(sessionStorage.getItem('enabled')??'true'),fail:false,reloaded:0};
  window.close=()=>{};
  window.chrome={runtime:{sendMessage:async m=>{
   if(window.fixture.fail)return {ok:false,error:'Could not save. Please try again.'};
   if(m.type==='set-enabled'){window.fixture.enabled=m.enabled;sessionStorage.setItem('enabled',JSON.stringify(m.enabled));}
   return {ok:true,enabled:window.fixture.enabled};
  }},tabs:{query:async()=>[{id:42,url:'https://www.youtube.com/watch?v=test'}],reload:async id=>{if(id!==42)throw Error('Wrong tab');window.fixture.reloaded++;}},scripting:{executeScript:async()=>[{result:true}]}};
 });
 await page.goto(pathToFileURL(path.join(root,'popup/popup.html')).href);
 const ready=()=>page.waitForFunction(()=>!document.getElementById('enabled').disabled);
 await ready();
 assert.equal(await page.locator('body').innerText(),'YouTube AV1\nPrefer AV1\nReload YouTube');
 assert.equal(await page.locator('#apply').isDisabled(),true);
 if(screenshots) {
  await page.locator('body').screenshot({path:screenshotPath('popup-dark.png')});
  await page.emulateMedia({colorScheme:'light'});
  await page.locator('body').screenshot({path:screenshotPath('popup-light.png')});
  await page.emulateMedia({colorScheme:'dark'});
 }
 await page.locator('#enabled').uncheck(); await ready();
 assert.equal(await page.locator('#apply').isEnabled(),true);
 if(screenshots) await page.locator('body').screenshot({path:screenshotPath('popup-pending.png')});
 await page.reload();await ready();
 assert.equal(await page.locator('#enabled').isChecked(),false);
 assert.equal(await page.locator('#apply').isEnabled(),true);
 await page.locator('#enabled').check(); await ready();
 assert.equal(await page.locator('#apply').isDisabled(),true);
 await page.evaluate(()=>window.fixture.fail=true);
 await page.locator('#enabled').click();await ready();
 assert.equal(await page.locator('#enabled').isChecked(),true);
 assert.equal(await page.locator('#apply').isDisabled(),true);
 await page.evaluate(()=>window.fixture.fail=false);
 await page.locator('#enabled').uncheck();await ready();
 await page.locator('#apply').click();await ready();
 assert.equal(await page.evaluate(()=>window.fixture.reloaded),1);
 assert.equal(await page.locator('#apply').isDisabled(),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),300);
 await page.emulateMedia({colorScheme:'light'});
 assert.equal(await page.locator('#apply').isDisabled(),true);
 assert.deepEqual(errors,[]);
 console.log('PASS: minimal UI text; reload disabled initially, enabled after change, pending across reopen, disabled after reverting/reloading; save failure rollback; correct tab reload; no JS errors or overflow (browser APIs mocked).');
 }finally {await browser.close();}
})();
