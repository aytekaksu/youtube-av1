const vm=require('node:vm');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname, '..')+'/';
function sandbox(pref){
 const c=vm.createContext({console});
 vm.runInContext(`
 class Storage { constructor(){this.data=new Map()} getItem(k){return this.data.get(k)??null} setItem(k,v){this.data.set(k,String(v))} removeItem(k){this.data.delete(k)} }
 class HTMLMediaElement {canPlayType(t){return t.includes('avc1')?'probably':''}}
 const MediaSource={isTypeSupported:t=>t.includes('avc1')};
 const navigator={mediaCapabilities:{decodingInfo:async config=>({supported:false,smooth:false,powerEfficient:false,original:true})}};
 const window={Storage,HTMLMediaElement,MediaSource,navigator,localStorage:new Storage(),sessionStorage:new Storage()};
 globalThis.window=window;
 `,c);
 if(pref!==null) c.window.localStorage.setItem('yt-player-av1-pref',pref);
 return c;
}
(async()=>{
 const c=sandbox('8192'); vm.runInContext(fs.readFileSync(root+'src/force-av1.js','utf8'),c);
 const w=c.window;
 for(const mime of ['video/mp4; codecs="av01.0.08M.08"','video/webm; codecs=av1','video/mp4; codecs=av01.0.08M.08']) {
  assert.equal(w.MediaSource.isTypeSupported(mime),true);
  assert.equal(new w.HTMLMediaElement().canPlayType(mime),'probably');
  assert.equal((await w.navigator.mediaCapabilities.decodingInfo({video:{contentType:mime}})).supported,true);
 }
 assert.equal(w.MediaSource.isTypeSupported('audio/mp4; codecs=av01'),false);
 assert.equal(w.MediaSource.isTypeSupported('video/mp4; codecs=avc1'),true);
 assert.equal((await w.navigator.mediaCapabilities.decodingInfo({video:{contentType:'video/mp4; codecs=avc1'}})).original,true);
 assert.equal(w.localStorage.getItem('yt-player-av1-pref'),'8192');
 assert.equal(w.localStorage.data.has('yt-player-av1-pref'),false,'forced preference must not persist');
 w.localStorage.setItem('other','value'); assert.equal(w.localStorage.getItem('other'),'value');
 w.sessionStorage.setItem('yt-player-av1-pref','original'); assert.equal(w.sessionStorage.getItem('yt-player-av1-pref'),'original');
 vm.runInContext(fs.readFileSync(root+'src/force-av1.js','utf8'),c);
 for(const [initial,want] of [['8192',null],['custom','custom'],[null,null]]){
  const off=sandbox(initial);vm.runInContext(fs.readFileSync(root+'src/reset-av1.js','utf8'),off);
  assert.equal(off.window.localStorage.getItem('yt-player-av1-pref'),want);
  assert.equal(off.window.MediaSource.isTypeSupported('video/mp4; codecs=av01'),false);
 }
 let handler,registered=[],settings={},failure=false;
 const bg=vm.createContext({console,chrome:{runtime:{id:'test',getURL:p=>'chrome-extension://test/'+p,getManifest:()=>({host_permissions:['https://www.youtube.com/*']}),onInstalled:{addListener(){}},onStartup:{addListener(){}},onMessage:{addListener:f=>handler=f}},storage:{local:{get:async()=>({...settings}),set:async value=>{if(failure)throw Error('storage failure');settings={...settings,...value};}}},scripting:{getRegisteredContentScripts:async()=>registered,registerContentScripts:async scripts=>{registered=scripts},updateContentScripts:async scripts=>{registered=scripts}}}});
 vm.runInContext(fs.readFileSync(root+'src/background.js','utf8'),bg);
 const send=message=>new Promise(resolve=>handler(message,{id:'test',url:'chrome-extension://test/popup/popup.html'},resolve));
 assert.equal((await send({type:'get-settings'})).enabled,true);
 assert.equal(registered[0].js[0],'src/force-av1.js');
 assert.equal((await send({type:'set-enabled',enabled:false})).enabled,false);
 assert.equal(registered[0].js[0],'src/reset-av1.js');
 failure=true; assert.equal((await send({type:'set-enabled',enabled:true})).ok,false);
 assert.equal(registered[0].js[0],'src/reset-av1.js'); failure=false;
 await Promise.all([send({type:'set-enabled',enabled:true}),send({type:'set-enabled',enabled:false}),send({type:'set-enabled',enabled:true})]);
 assert.equal(settings.enabled,true); assert.equal(registered[0].js[0],'src/force-av1.js');
 assert.equal(handler({type:'set-enabled',enabled:false},{id:'test',url:'https://www.youtube.com/',tab:{}},()=>{}),undefined);
 console.log('PASS: codec patch passthrough, quoted/unquoted AV1, preference cleanup, no persistent forced value, idempotency, on/off registration, storage-failure rollback, rapid-toggle ordering, sender restriction. VM fixtures.');
})();
