export const TROY_OUNCE_GRAMS=31.1034768;
export function normalizeMetalRates(gold,silver,fx,now=new Date()) {
  if(gold.symbol!=='XAU'||silver.symbol!=='XAG'||gold.currency!=='USD'||silver.currency!=='USD'||fx.base!=='USD') throw new Error('Unexpected feed currency or symbol');
  const exchange=fx.rates?.INR;
  if(![gold.price,silver.price,exchange].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0)) throw new Error('Invalid feed value');
  const times=[gold.updatedAt,silver.updatedAt];
  if(times.some(t=>!Number.isFinite(Date.parse(t))||Date.parse(t)>now.getTime()+300000))throw new Error('Invalid price timestamp');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(fx.date)||!Number.isFinite(Date.parse(fx.date)))throw new Error('Missing exchange rate date');
  const goldGram=gold.price*exchange/TROY_OUNCE_GRAMS,silverGram=silver.price*exchange/TROY_OUNCE_GRAMS;
  return {currency:'INR',unit:'gram',gold:[24,22,18,14].map(k=>({label:`${k}K`,value:goldGram*k/24})),silver:[999,925].map(f=>({label:String(f),value:silverGram*f/1000})),goldAt:gold.updatedAt,silverAt:silver.updatedAt,fxDate:fx.date,fxRate:exchange,fetchedAt:now.toISOString(),delayed:times.some(t=>now.getTime()-Date.parse(t)>15*60000)||now.getTime()-Date.parse(fx.date)>4*86400000,source:'Gold API + Frankfurter',stale:false};
}
