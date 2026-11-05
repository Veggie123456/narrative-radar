const stop=new Set(['the','and','for','with','from','this','that','token','coin','pump','launch','solana','new','official','based','about','into','your','have','just','will','they','their','there','when','where','what','more','some','latest','live','https','com']);
export function words(s){return [...new Set((s||'').toLowerCase().replace(/https?:\/\/\S+/g,' ').match(/[a-z][a-z0-9]{2,}/g)||[])].filter(x=>!stop.has(x))}
export function analyze(launches=[],signals=[],now=Date.now()){
 const recent=launches.filter(x=>Number.isFinite(Date.parse(x.seenAt))&&now-Date.parse(x.seenAt)<=6*3600000&&now>=Date.parse(x.seenAt));
 const buckets=new Map();
 for(const token of recent){for(const word of words([token.name,token.symbol,token.description].join(' ')).slice(0,16)){const b=buckets.get(word)||{keyword:word,launches:[],recent15:0,previousHour:0,previous6h:0};b.launches.push(token);const age=now-Date.parse(token.seenAt);if(age<=900000)b.recent15++;if(age>900000&&age<=4500000)b.previousHour++;if(age>4500000)b.previous6h++;buckets.set(word,b)}}
 const narratives=[...buckets.values()].filter(x=>x.launches.length>=2).map(x=>{
 const unique=[...new Map(x.launches.map(t=>[t.chain+':'+t.address,t])).values()].sort((a,b)=>Date.parse(a.seenAt)-Date.parse(b.seenAt));
 const base=x.previousHour/4;const lift=base?Math.round(x.recent15/base*100)/100:null;
 const news=signals.filter(s=>words(s.title).includes(x.keyword)).slice(-5);
 const score=Math.min(100,Math.round(x.recent15*15+Math.min(35,(lift||0)*8)+Math.min(15,news.length*5)));
 return {keyword:x.keyword,launchCount:unique.length,burst15m:x.recent15,baselinePreviousHour:x.previousHour,lift15m:lift,heatScore:score,firstSeen:unique[0]?.seenAt,leader:unique[0],tokens:unique.slice(0,30),catalysts:news,confidence:news.length?'medium':'low',explanation:'Launch-frequency heuristic. Does not imply verified social momentum, buyers, or profitability.'}
 }).sort((a,b)=>b.heatScore-a.heatScore||b.burst15m-a.burst15m);
 const tokenWords=new Set(launches.flatMap(t=>words(t.name+' '+t.symbol)));
 const opportunities=signals.slice(-120).filter(s=>{const w=words(s.title);return w.length&&w.every(x=>!tokenWords.has(x))}).slice(-30).map(s=>({title:s.title,source:s.source,url:s.url||null,seenAt:s.seenAt,matchStatus:'No exact keyword overlap in collected token sample; not a chain-wide absence check',confidence:'low'}));
 return {narratives:narratives.slice(0,100),opportunities,metrics:{launchesLast6h:recent.length,burstThemes:narratives.filter(x=>x.burst15m>=3).length}};
}
