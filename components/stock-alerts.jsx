'use client';
import {useEffect,useState} from 'react';
export default function StockAlerts({data,onBranch,onItem,onTransfer,onOrders,update}) {
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
  const minimum=data.minimumBranchStock??3;
  const low=data.branches.map(b=>({...b,count:data.items.filter(i=>i.branchId===b.id&&i.status==='Available').length})).filter(b=>b.count<minimum);
  const quarantined=data.items.filter(i=>i.status==='Quarantine');
  const overdue=data.transfers.filter(t=>t.status==='In transit'&&t.sentAt&&now-Date.parse(t.sentAt)>48*3600000);
  const pending=data.transfers.filter(t=>t.status==='Requested');
  const unpaid=data.holds.filter(h=>h.state==='Payment pending');
  const paid=data.holds.filter(h=>h.state==='Deposit received');
  const count=low.length+quarantined.length+overdue.length+pending.length+unpaid.length+paid.length;
  return <section className="panel"><div className="panel-title"><div><h2>Needs attention · {count}</h2><p>Open stock, delivery and payment tasks. Checked every minute while this page is open.</p></div><label>Minimum available units<select aria-label="Minimum branch stock" value={minimum} onChange={e=>update(d=>({...d,minimumBranchStock:Number(e.target.value)}),'Updated branch stock alert threshold')}>{[1,2,3,5,10].map(n=><option key={n} value={n}>{n}</option>)}</select></label></div><div className="panel-body"><p>Stock alerts compare total available units at each branch with your minimum.</p>{!count&&<p>No stock alerts. All checks are clear.</p>}{low.map(b=><div className="detail-row" key={b.id}><span><b>{b.name}</b> · {b.count} available / minimum {minimum}</span><button onClick={()=>onBranch(b.id)}>View stock</button></div>)}{quarantined.map(i=><div className="detail-row" key={i.id}><span>{i.name} · Inspection needed</span><button onClick={()=>onItem(i.id)}>View item</button></div>)}{overdue.map(t=><div className="detail-row" key={t.id}><span>{t.id} · Receipt overdue · {Math.floor((now-Date.parse(t.sentAt))/3600000)} hours since dispatch</span><button onClick={()=>onTransfer(t.id)}>Review transfer</button></div>)}{pending.map(t=><div className="detail-row" key={t.id}><span><b>{t.id}</b> · {t.itemName} · Waiting for dispatch</span><button onClick={()=>onTransfer(t.id)}>Dispatch goods</button></div>)}
{unpaid.map(h=><div className="detail-row" key={h.id}><span><b>{h.id}</b> · {h.customer} · Payment pending</span><button onClick={onOrders}>Review order</button></div>)}
{paid.map(h=><div className="detail-row" key={h.id}><span><b>{h.id}</b> · Deposit received · Finance review needed</span><button onClick={onOrders}>Review payment</button></div>)}
<p className="stock-caption">Overdue means more than 48 hours since dispatch. Payment reminders do not send messages or release reserved stock automatically.</p></div></section>;
}

