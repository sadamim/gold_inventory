import test from 'node:test';
import assert from 'node:assert/strict';
import { periodRange, summarizeTransfers, isWithin } from '../lib/reporting.mjs';
import { createSeed } from '../lib/data.mjs';
test('Yesterday follows IST midnight, including a UTC date boundary',()=>{
 assert.deepEqual(periodRange('yesterday',new Date('2026-09-18T21:00:00Z')),{start:'2026-09-17T18:30:00.000Z',end:'2026-09-18T18:30:00.000Z'});
});
test('Last week is the previous completed Monday to Sunday',()=>{
 assert.deepEqual(periodRange('week',new Date('2026-09-21T08:00:00Z')),{start:'2026-09-13T18:30:00.000Z',end:'2026-09-20T18:30:00.000Z'});
});
test('Month and year boundaries handle leap years and January',()=>{
 assert.deepEqual(periodRange('month',new Date('2024-03-15T08:00:00Z')),{start:'2024-01-31T18:30:00.000Z',end:'2024-02-29T18:30:00.000Z'});
 assert.deepEqual(periodRange('year',new Date('2026-01-01T08:00:00Z')),{start:'2024-12-31T18:30:00.000Z',end:'2025-12-31T18:30:00.000Z'});
});
test('Report ranges include start and exclude end',()=>{
 const r=periodRange('yesterday',new Date('2026-09-19T08:00:00Z'));
 assert.equal(isWithin(r.start,r),true);assert.equal(isWithin(r.end,r),false);assert.equal(isWithin(null,r),false);
});
test('Branch reports use independent dispatch and receipt times, and deduplicate network transfers',()=>{
 const now=new Date('2026-09-19T08:00:00Z'),branches=[{id:'A'},{id:'B'}];
 const transfers=[{id:'T1',from:'A',to:'B',quantity:1,value:100,sentAt:'2026-09-18T06:00:00Z',receivedAt:'2026-09-18T09:00:00Z'},{id:'T2',from:'A',to:'B',quantity:2,value:200,sentAt:'2026-09-17T06:00:00Z',receivedAt:'2026-09-18T10:00:00Z'}];
 const all=summarizeTransfers(transfers,branches,'yesterday','all',now);
 assert.equal(all.uniqueTransfers,2);assert.equal(all.sent,1);assert.equal(all.received,3);assert.equal(all.value,100);
 const a=summarizeTransfers(transfers,branches,'yesterday','A',now);assert.equal(a.rows.length,1);assert.equal(a.sent,1);assert.equal(a.received,0);
 assert.equal(a.uniqueTransfers,1);assert.deepEqual(a.relevant.map(t=>t.id),['T1']);
 const b=summarizeTransfers(transfers,branches,'yesterday','B',now);assert.equal(b.sent,0);assert.equal(b.received,3);assert.equal(b.rows[0].receivedValue,300);
});
test('New branch has an empty report, not another branch totals',()=>{
 const r=summarizeTransfers([],[{id:'new',name:'Mumbai'}],'month','new');assert.equal(r.uniqueTransfers,0);assert.equal(r.rows[0].incoming,0);assert.equal(r.rows[0].outgoing,0);
});
test('Demo history provides named handovers in every requested period',()=>{
 const now=new Date('2026-09-19T08:00:00Z');const d=createSeed(now);
 for(const p of ['yesterday','week','month','year']){const r=summarizeTransfers(d.transfers,d.branches,p,'all',now);assert.ok(r.uniqueTransfers>0);assert.ok(r.relevant.every(t=>t.sender&&t.receiver&&t.sentAt&&t.receivedAt));}
 assert.equal(d.items.length,16);assert.equal(new Set(d.items.map(i=>i.id)).size,16);
});
