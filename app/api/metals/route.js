import { normalizeMetalRates } from '../../../lib/metals.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
let cache=null;
let pending=null;
async function getJson(url){const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('Rate provider unavailable');return response.json();}
export async function GET(){
  if(cache&&Date.now()-Date.parse(cache.fetchedAt)<60000)return Response.json(cache);
  try {
    if(!pending)pending=Promise.all([getJson('https://api.gold-api.com/price/XAU'),getJson('https://api.gold-api.com/price/XAG'),getJson('https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR')]).then(([gold,silver,fx])=>{cache=normalizeMetalRates(gold,silver,fx);return cache;}).finally(()=>{pending=null;});
    return Response.json(await pending);
  }catch{
    if(cache&&Date.now()-Date.parse(cache.fetchedAt)<86400000)return Response.json({...cache,stale:true,delayed:true,error:'Refresh unavailable. Showing the last successful benchmark.'});
    return Response.json({error:'Live rates are temporarily unavailable. Please retry.',source:'Gold API + Frankfurter'}, {status:503});
  }
}
