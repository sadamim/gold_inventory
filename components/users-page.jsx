'use client';
import { useState } from 'react';
import { demoUsers } from '../lib/data.mjs';

export function staffProfiles(data) {
  return data.staff || demoUsers.map((u,index)=>({id:u.id,name:u.name,email:u.email,role:u.role,branchId:index===0?'all':index===1?'BR-001':'BR-003',status:'Active'}));
}

export default function UsersPage({data,user,update,notify}) {
  const [query,setQuery]=useState('');
  const [editing,setEditing]=useState(null);
  const staff=staffProfiles(data);
  const branchName=id=>id==='all'?'All branches':data.branches.find(b=>b.id===id)?.name||'Unassigned';
  function save(e) {
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const name=String(f.get('name')).trim(),email=String(f.get('email')).trim().toLowerCase();
    if(!name||!email){notify('Enter a name and email address.');return;}
    if(staff.some(s=>s.id!==editing.id&&s.email.toLowerCase()===email)){notify('This email is already in the staff list.');return;}
    const record={id:editing.id||crypto.randomUUID(),name,email,role:f.get('role'),branchId:f.get('branch'),status:f.get('status')};
    update(d=>({...d,staff:editing.id?staffProfiles(d).map(s=>s.id===editing.id?record:s):[...staffProfiles(d),record]}),`${editing.id?'Updated':'Added'} staff profile: ${name}`);
    setEditing(null);notify('Staff profile saved.');
  }
  return <>
    <div className="page-heading"><div><div className="eyebrow">INVENTORY NEXUS / USERS</div><h1>Users</h1><p>Keep staff contact details, roles and branch assignments in one place.</p></div><button className="primary" onClick={()=>setEditing({})}>Add user profile</button></div>
    <div className="notice">Staff profiles are a demo directory. Roles and inactive status do not change login access. Sign in using the existing test accounts.</div>
    <div className="metrics">{[['Staff profiles',staff.length],['Active staff',staff.filter(s=>s.status==='Active').length],['Assigned branches',new Set(staff.filter(s=>s.branchId!=='all'&&s.status==='Active').map(s=>s.branchId)).size]].map(([label,value])=><div className="panel panel-body" key={label}><h3>{label}</h3><h2>{value}</h2></div>)}</div>
    <section className="panel"><div className="panel-title"><div><h2>My account</h2><p>{user.name} · {user.email}</p></div><span className="badge">Demo account</span></div><div className="panel-body"><p>{user.role} · Your current sign-in</p><button onClick={()=>setEditing(staff.find(s=>s.id===user.id)||{name:user.name,email:user.email})}>Edit my directory profile</button></div></section>
    {editing&&<section className="panel"><div className="panel-title"><h2>{editing.id?'Edit user profile':'New user profile'}</h2><button onClick={()=>setEditing(null)}>Cancel</button></div><form className="panel-body" onSubmit={save} key={editing.id||'new'}><div className="form-grid"><label>Full name<input name="name" required maxLength={70} defaultValue={editing.name}/></label><label>Email<input name="email" type="email" required maxLength={100} defaultValue={editing.email}/></label><label>Role<select name="role" defaultValue={editing.role||'Branch operator'}><option>Operations manager</option><option>Branch operator</option><option>Stock reviewer</option></select></label><label>Branch<select name="branch" defaultValue={editing.branchId||'all'}><option value="all">All branches</option>{data.branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>Directory status<select name="status" defaultValue={editing.status||'Active'}><option>Active</option><option>Inactive</option></select></label></div><button className="primary">Save profile</button></form></section>}
    <section className="panel"><div className="panel-title"><h2>Staff directory</h2><input aria-label="Search staff" placeholder="Search name, email or branch" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="table-scroll"><table><thead><tr><th>NAME / EMAIL</th><th>ROLE</th><th>BRANCH</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{staff.filter(s=>`${s.name} ${s.email} ${branchName(s.branchId)}`.toLowerCase().includes(query.toLowerCase())).map(s=><tr key={s.id}><td><b>{s.name}</b><small>{s.email}</small></td><td>{s.role}</td><td>{branchName(s.branchId)}</td><td>{s.status}</td><td><button onClick={()=>setEditing(s)}>Edit</button></td></tr>)}</tbody></table></div>{!staff.some(s=>`${s.name} ${s.email} ${branchName(s.branchId)}`.toLowerCase().includes(query.toLowerCase()))&&<p className="panel-body">No staff match your search.</p>}</section>
  </>;
}

