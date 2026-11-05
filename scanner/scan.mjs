import {pumpFunSample,xRecent,gmgnNews,ponsEvents} from './optional-sources.mjs';
import fs from 'node:fs/promises';
const file=new URL('../data.json',import.meta.url);
const previous=await fs.readFile(file,'utf8').then(JSON.parse).catch(()=>({launches:[],signals:[],candidates:[]}));
if(process.env.SCANNER_ENABLED==='false'){console.log('Scanner paused');process.exit(0)}
const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'NarrativeRadar/1.0'}});if(!r.ok)throw Error('HTTP '+r.status);return r.text()};
const jobs=[['DEX profiles','https://api.dexscreener.com/token-profiles/latest/v1'],['DEX boosts','https://api.dexscreener.com/token-boosts/latest/v1'],['Hacker News RSS','https://hnrss.org/frontpage'],['Reddit technology RSS','https://www.reddit.com/r/technology/.rss']];
const settled=await Promise.allSettled(jobs.map(x=>get(x[1])));
const health=jobs.map((x,i)=>({name:x[0],ok:settled[i].status==='fulfilled',error:settled[i].status==='rejected'?String(settled[i].reason):null}));
let launches=[],signals=[];
for(let i=0;i<settled.length;i++){if(settled[i].status!=='fulfilled')continue;const body=settled[i].value;if(i<2){try{for(const x of JSON.parse(body)){if(!x.tokenAddress)continue;launches.push({chain:x.chainId,address:x.tokenAddress,name:(x.description||'').split(/[.\n]/)[0].slice(0,80)||'Unknown',symbol:'',description:x.description||'',image:x.icon||'',url:x.url||'',source:jobs[i][0],seenAt:new Date().toISOString()})}}catch(e){health[i].ok=false;health[i].error=String(e)}}else{for(const m of body.matchAll(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi)){const t=m[0];const title=(t.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').trim();if(title)signals.push({title,source:jobs[i][0],seenAt:new Date().toISOString()})}}}
const merged=(current,old,key,max)=>[...new Map([...old,...current].map(x=>[key(x),x])).values()].slice(-max);
launches=merged(launches,previous.launches||[],x=>x.chain+':'+x.address,2000);
signals=merged(signals,previous.signals||[],x=>x.title.toLowerCase(),600);
const categories={AI:/\b(ai|agent|robot|gpt|llm)\b/i,Animals:/\b(cat|dog|frog|bird|pepe)\b/i,Gaming:/\b(game|gaming|pokemon|play)\b/i,Politics:/\b(election|president|politic)\b/i,Memes:/\b(meme|viral|joke)\b/i};
const candidates=signals.slice(-100).map(x=>{const tags=Object.entries(categories).filter(([_,re])=>re.test(x.title)).map(([k])=>k);const words=x.title.replace(/[^a-z0-9 ]/gi,' ').trim().split(/\s+/).filter(w=>w.length>3);const name=words.slice(0,3).join(' ').slice(0,40)||'Untitled';const ticker=words.slice(0,2).map(w=>w[0]).join('').toUpperCase().slice(0,8)||'MEME';const matches=launches.filter(t=>t.name.toLowerCase()===name.toLowerCase()||t.symbol?.toUpperCase()===ticker).slice(0,10);return {...x,name,ticker,description:'Concept based on news headline: '+x.title,utility:'Research-backed meme/news tracker for '+name,imagePrompt:'Cartoon mascot depicting '+name,category:tags,duplicateMatches:matches.map(t=>({chain:t.chain,address:t.address})),score:Math.min(50,10+tags.length*10),confidence:'low',scoreExplanation:'Heuristic keyword relevance only; no social momentum or trade profitability verified'}}).sort((a,b)=>b.score-a.score).slice(0,100);
const optional=await Promise.allSettled([pumpFunSample(),xRecent(),gmgnNews(),ponsEvents()]);
for(let i=0;i<optional.length;i++){
 const name=['Pump.fun sample','X / Twitter','GMGN','Pons RPC'][i];
 const v=optional[i].status==='fulfilled'?optional[i].value:{ok:false,events:[],error:String(optional[i].reason)};
 health.push({name,ok:v.ok,error:v.error||null});
 if(i===0&&v.events?.length)launches=merged(v.events,launches,x=>x.chain+':'+x.address,2000);
 if((i===1||i===2)&&v.events?.length)signals=merged(v.events,signals,x=>x.title.toLowerCase(),600);
}
// Refresh candidate list after optional social/news sources are incorporated.
const refreshed=signals.slice(-100).map(x=>{const tags=Object.entries(categories).filter(([_,re])=>re.test(x.title)).map(([k])=>k);const words=x.title.replace(/[^a-z0-9 ]/gi,' ').trim().split(/\\s+/).filter(w=>w.length>3);const name=words.slice(0,3).join(' ').slice(0,40)||'Untitled';const ticker=words.slice(0,2).map(w=>w[0]).join('').toUpperCase().slice(0,8)||'MEME';return {...x,name,ticker,description:'Concept based on source headline: '+x.title,utility:'Research-backed meme/news tracker for '+name,imagePrompt:'Cartoon mascot depicting '+name,category:tags,duplicateMatches:launches.filter(t=>t.name.toLowerCase()===name.toLowerCase()||t.symbol?.toUpperCase()===ticker).slice(0,10).map(t=>({chain:t.chain,address:t.address})),score:Math.min(50,10+tags.length*10),confidence:'low',scoreExplanation:'Heuristic relevance only; social momentum and profitability not verified'}}).sort((a,b)=>b.score-a.score).slice(0,100);
candidates.splice(0,candidates.length,...refreshed);
const result={updatedAt:new Date().toISOString(),health,launches,candidates,signals};
await fs.writeFile(file,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({updatedAt:result.updatedAt,launches:launches.length,signals:signals.length,candidates:candidates.length,health}));
