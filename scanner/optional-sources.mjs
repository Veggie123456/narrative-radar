// Optional sources: each source is marked healthy only after an actual response.
export async function pumpFunSample(durationMs=12000){
  const events=[];const ws=new WebSocket('wss://pumpportal.fun/api/data');
  return await new Promise(resolve=>{
    let finished=false;
    const done=(error)=>{if(finished)return;finished=true;try{ws.close()}catch{}resolve({ok:!error,events,error:error||null})};
    const timer=setTimeout(()=>done(null),durationMs);
    ws.addEventListener('open',()=>{try{ws.send(JSON.stringify({method:'subscribeNewToken'}))}catch(e){clearTimeout(timer);done(String(e))}});
    ws.addEventListener('message',ev=>{try{const x=JSON.parse(ev.data);if(x.mint&&x.name)events.push({chain:'solana',address:x.mint,name:x.name,symbol:x.symbol||'',description:x.description||'',source:'Pump.fun via PumpPortal',seenAt:new Date().toISOString(),url:'https://pump.fun/coin/'+encodeURIComponent(x.mint)})}catch{}});
    ws.addEventListener('error',()=>{clearTimeout(timer);done('WebSocket connection failed')});
    ws.addEventListener('close',()=>{if(!finished){clearTimeout(timer);done('WebSocket closed before sampling completed')}});
  });
}
export async function xRecent(){
  const bearer=process.env.X_BEARER_TOKEN;
  if(!bearer)return {ok:false,events:[],error:'X_BEARER_TOKEN not configured'};
  const query=encodeURIComponent(process.env.X_QUERY||'(memecoin OR pumpfun OR crypto meme) -is:retweet lang:en');
  const r=await fetch('https://api.x.com/2/tweets/search/recent?query='+query+'&max_results=30&tweet.fields=created_at,public_metrics',{headers:{Authorization:'Bearer '+bearer},signal:AbortSignal.timeout(12000)});
  if(!r.ok)return {ok:false,events:[],error:'X API HTTP '+r.status};
  const data=await r.json();return {ok:true,events:(data.data||[]).map(x=>({title:x.text,source:'X / Twitter',url:'https://x.com/i/status/'+x.id,seenAt:x.created_at||new Date().toISOString()}))};
}
export async function gmgnNews(){
  // GMGN does not publish a stable documented public news API. Only accept a user-configured endpoint.
  const url=process.env.GMGN_NEWS_ENDPOINT;
  if(!url)return {ok:false,events:[],error:'GMGN_NEWS_ENDPOINT not configured; no verified public news API'};
  const u=new URL(url);if(u.protocol!=='https:')return {ok:false,events:[],error:'HTTPS endpoint required'};
  const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)return {ok:false,events:[],error:'GMGN endpoint HTTP '+r.status};
  const json=await r.json();if(!Array.isArray(json))return {ok:false,events:[],error:'Endpoint must return an array'};
  return {ok:true,events:json.slice(0,100).filter(x=>typeof x.title==='string').map(x=>({title:x.title,source:'GMGN',url:x.url||'',seenAt:x.publishedAt||new Date().toISOString()}))};
}
export async function ponsEvents(){
  // Pons on Robinhood Chain needs a verified event contract and chain RPC.
  const rpc=process.env.PONS_RPC_URL,contract=process.env.PONS_FACTORY_ADDRESS;
  if(!rpc||!contract)return {ok:false,events:[],error:'PONS_RPC_URL and PONS_FACTORY_ADDRESS required'};
  if(!/^0x[0-9a-fA-F]{40}$/.test(contract))return {ok:false,events:[],error:'Invalid factory address'};
  const r=await fetch(rpc,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_blockNumber',params:[]}),signal:AbortSignal.timeout(12000)});
  const j=await r.json();return {ok:r.ok&&!!j.result,events:[],error:'RPC connected; event ABI and indexed topic not configured, no events decoded'};
}
