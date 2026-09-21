import { periodRange } from './reporting.mjs';
export const demoUsers = [
  { id: 'user-1', name: 'Ananya Kumar', email: 'admin@global.demo', password: 'Inventory123!', role: 'Operations manager', initials: 'AK' },
  { id: 'user-2', name: 'James Wilson', email: 'london@global.demo', password: 'Inventory123!', role: 'Branch operator', initials: 'JW' },
  { id: 'user-3', name: 'Meera Shah', email: 'singapore@global.demo', password: 'Inventory123!', role: 'Branch operator', initials: 'MS' }
];
export const initialBranches = [
  {id:'BR-001',name:'London',country:'United Kingdom',type:'Flagship store',manager:'James Wilson',email:'london@example.com',address:'18 Demo Street, London',code:'LON',tone:'mint'},
  {id:'BR-002',name:'New York',country:'United States',type:'Retail & fulfilment',manager:'Emma Chen',email:'newyork@example.com',address:'25 Example Avenue, New York',code:'NYC',tone:'blue'},
  {id:'BR-003',name:'Singapore',country:'Singapore',type:'Distribution hub',manager:'Meera Shah',email:'singapore@example.com',address:'42 Sample Road, Singapore',code:'SIN',tone:'lilac'},
  {id:'BR-004',name:'Dubai',country:'United Arab Emirates',type:'Retail & fulfilment',manager:'Omar Hassan',email:'dubai@example.com',address:'7 Demo Boulevard, Dubai',code:'DXB',tone:'sand'}
];
const products = ['Wireless Headphones','Cotton T-shirt','Office Chair','Ceramic Dinner Set','Cordless Drill','Coffee Beans','Running Shoes','LED Desk Lamp','Travel Backpack','Yoga Mat','USB-C Cable Pack','Storage Basket','Notebook Set','Hand Soap Refill','Water Bottle','Air Purifier'];
const categories = ['Electronics','Apparel','Furniture','Home & kitchen','Tools','Food & beverage','Footwear','Lighting','Bags & travel','Sports','Accessories','Storage','Stationery','Personal care','Outdoor','Appliances'];
const variants = ['Black · Bluetooth','Navy · Medium','Grey · Adjustable','White · 12-piece set','20V · Standard kit','Medium roast · 1 kg bag','Blue · EU 42','White · USB powered','Charcoal · 30 L','Green · 6 mm','3-pack · 1 m','Natural · Large','A5 · 5-pack','Unscented · 1 L','Steel · 750 ml','White · HEPA'];
const units = ['Each','Each','Each','Set','Kit','Bag','Pair','Each','Each','Each','Pack','Each','Pack','Bottle','Each','Each'];
export const initialItems = products.map((name,i)=>({id:`INV-${2401+i}`,name,category:categories[i],variant:variants[i],unit:units[i],branchId:initialBranches[i%4].id,value:[10990,2490,21990,7490,12990,1990,7990,3990,6490,2790,1490,1890,1290,990,2390,16990][i],status:i===2||i===7?'Reserved':i===10?'In transit':i===13?'Quarantine':'Available',owner:i===13?'Supplier':'Company',age:[34,62,18,92,25,114,43,145,12,67,8,42,183,5,54,98][i],photo:i<4?i:null}));
export function createSeed(now=new Date()) {
  const transfers=[];
  for(const [pi,period] of ['year','month','week','yesterday'].entries()) {
    const range=periodRange(period,now); const start=Date.parse(range.start),end=Date.parse(range.end);
    for(let i=0;i<8;i++) {
      const from=initialBranches[i%4],to=initialBranches[(i+1+(pi%2))%4];
      const sentAt=new Date(start+(end-start)*((i+1)/11)).toISOString();
      const receivedAt=new Date(Math.min(Date.parse(sentAt)+3600000,end-1000)).toISOString();
      const product=initialItems[(i+pi*3)%16];
      transfers.push({id:`TRF-H${pi}${i+1}`,itemId:`HIST-${pi}${i+1}`,itemName:product.name,from:from.id,to:to.id,quantity:1,value:product.value,sender:from.manager,receiver:to.manager,sentAt,receivedAt,createdAt:sentAt,status:'Received',seal:`PKG-H${pi}${i+1}`,reason:'Historical demo replenishment',historical:true,recordedBy:'Demo seed'});
    }
  }
  transfers.unshift({id:'TRF-0281',itemId:'INV-2411',itemName:'USB-C Cable Pack',from:'BR-003',to:'BR-001',quantity:1,value:1490,sender:'Meera Shah',receiver:'',sentAt:new Date(now.getTime()-3*3600000).toISOString(),receivedAt:null,createdAt:new Date(now.getTime()-4*3600000).toISOString(),status:'In transit',seal:'SEAL-0841',reason:'Store replenishment',historical:false,recordedBy:'Meera Shah'});
  return {version:2,branches:initialBranches,items:initialItems,transfers,holds:[{id:'RSV-1084',itemId:'INV-2403',channel:'Website',customer:'Customer 042',state:'Payment pending'},{id:'RSV-1085',itemId:'INV-2408',channel:'Retail store',customer:'Customer 017',state:'Deposit received'}],events:[{id:'EVT-1',action:'Demo workspace initialized',actor:'System',at:now.toISOString()}],synced:false,approvalSent:false};
}
