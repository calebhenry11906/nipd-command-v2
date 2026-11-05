import {useEffect,useState} from 'react';
import {Link,NavLink,Navigate,Route,Routes,useLocation} from 'react-router-dom';
import {LayoutDashboard,CalendarDays,ClipboardList,ShieldCheck,Users,Menu,X,LogOut,FileText,BookOpen,BriefcaseBusiness,PackageCheck,Clock3,ChevronRight,Search} from 'lucide-react';
import type {User} from '@supabase/supabase-js';
import {agencyId,configured,supabase} from '../lib/supabase';
import FieldTraining from '../features/field-training/FieldTraining';
import SignIn from '../features/auth/SignIn';
type FtepAccess='none'|'fto'|'coordinator'|'command'|'admin';
type NavItem={path:string;label:string;icon:typeof LayoutDashboard};
const groups:{title:string;links:NavItem[]}[]=[
 {title:'Overview',links:[{path:'/',label:'Dashboard',icon:LayoutDashboard},{path:'/requests',label:'My Requests',icon:ClipboardList}]},
 {title:'Workforce Operations',links:[{path:'/shifts',label:'Shift Assignment',icon:CalendarDays},{path:'/leave',label:'Leave & Training',icon:BriefcaseBusiness},{path:'/details',label:'Security Details',icon:ShieldCheck},{path:'/on-call',label:'On-Call',icon:Clock3}]},
 {title:'Department Resources',links:[{path:'/directory',label:'Employee Directory',icon:Users},{path:'/equipment',label:'Equipment',icon:PackageCheck},{path:'/policies',label:'Policies & Directives',icon:BookOpen}]},
 {title:'Specialized Programs',links:[{path:'/field-training',label:'Field Training',icon:FileText}]},
];
const pending=groups.flatMap(g=>g.links).filter(item=>item.path!=='/'&&item.path!=='/field-training');
function Placeholder({title}:{title:string}){return <section className="workspace"><div className="eyebrow">MIGRATION STATUS / NOT YET CONNECTED</div><h1>{title}</h1><p className="subtle">This module has not yet been migrated to React. Use the existing staging website for previously implemented workflows. No simulated employee records or approvals are shown here.</p><a className="text-link" href="https://calebhenry11906.github.io/nipd-command-v2/" target="_blank" rel="noopener noreferrer">Open legacy staging application <ChevronRight size={15}/></a></section>}
export default function App(){
 const[user,setUser]=useState<User|null>(null);
 const[loading,setLoading]=useState(true);
 const[ftep,setFtep]=useState<FtepAccess>('none');
 const[navOpen,setNavOpen]=useState(false);
 const location=useLocation();
 useEffect(()=>{
  const db=supabase;
  if(!db){setLoading(false);return}
  let active=true,version=0;
  async function sync(){
   const current=++version;setLoading(true);setFtep('none');
   const {data,error}=await db!.auth.getUser();
   if(!active||current!==version)return;
   if(error||!data.user){setUser(null);setLoading(false);return}
   const verifiedUser=data.user;
   setUser(verifiedUser);
   if(!agencyId){setLoading(false);return}
   const result=await db!.rpc('wf_ftep_my_access',{p_agency:agencyId});
   if(!active||current!==version)return;
   setFtep(!result.error?((result.data?.level||'none') as FtepAccess):'none');
   setLoading(false);
  }
  void sync();
  const {data:listener}=db.auth.onAuthStateChange(()=>{queueMicrotask(()=>{if(active)void sync()})});
  return()=>{active=false;version++;listener.subscription.unsubscribe()}
 },[]);
 useEffect(()=>{setNavOpen(false)},[location.pathname]);
 const allowedFtep=Boolean(user&&ftep!=='none'&&!loading);
 const navGroups=groups.map(group=>({...group,links:group.links.filter(item=>item.path!=='/field-training'||allowedFtep)})).filter(group=>group.links.length);
 if(loading)return <div className="state-screen" role="status"><div className="brand-mark">N</div><p>Verifying your NIPD Command session…</p></div>;
 if(!user)return <SignIn/>;
 const title=groups.flatMap(g=>g.links).find(item=>item.path===location.pathname)?.label||'Department workspace';
 return <div className="app-shell">
  <aside className={'sidebar '+(navOpen?'open':'')}>
   <div className="brand"><div className="brand-mark">N</div><div><strong>NIPD Command</strong><small>WORKFORCE MANAGEMENT</small></div><button className="mobile-close icon-button" type="button" onClick={()=>setNavOpen(false)} aria-label="Close menu"><X size={20}/></button></div>
   <nav aria-label="Main navigation">{navGroups.map(group=><div className="nav-group" key={group.title}><div className="nav-heading">{group.title}</div>{group.links.map(({path,label,icon:Icon})=><NavLink key={path} to={path} end={path==='/'} className={({isActive})=>'nav-link '+(isActive?'active':'')}><Icon size={18} aria-hidden="true"/><span>{label}</span></NavLink>)}</div>)}</nav>
   <div className="sidebar-foot">STAFF WORKFORCE MANAGEMENT ONLY<br/>No CAD, RMS, NCIC, or case records.<br/><strong>STAGING · NOT FOR OPERATIONAL USE</strong></div>
  </aside>
  {navOpen&&<button type="button" className="backdrop" onClick={()=>setNavOpen(false)} aria-label="Close navigation"/>}
  <div className="main-area"><header className="topbar"><div className="top-left"><button type="button" className="mobile-menu icon-button" onClick={()=>setNavOpen(true)} aria-label="Open navigation"><Menu size={22}/></button><div className="top-title"><span className="top-breadcrumb">NIPD Command / </span>{title}</div></div><div className="account"><span className="account-email">{user.email||'Authorized account'}</span><button className="icon-button" type="button" aria-label="Sign out" title="Sign out" onClick={()=>void supabase?.auth.signOut()}><LogOut size={18}/></button></div></header>
  <main className="page-content">{!configured&&<div className="notice" role="alert">The staging environment is not configured.</div>}
   <Routes>
    <Route path="/" element={<section className="workspace"><div className="eyebrow">OPERATIONS / WORKFORCE MANAGEMENT</div><div className="home-heading"><div><h1>Department workspace</h1><p className="subtle">One place for schedules, requests, employee resources, and training.</p></div><span className="stage-label">React modernization · staging</span></div><div className="section-title"><span>Quick access</span></div><div className="quick-links"><Link to="/shifts"><CalendarDays size={19}/>Shift Assignment<ChevronRight size={16}/></Link><Link to="/leave"><BriefcaseBusiness size={19}/>Leave & Training<ChevronRight size={16}/></Link>{allowedFtep&&<Link to="/field-training"><FileText size={19}/>Field Training<ChevronRight size={16}/></Link>}</div><div className="info-strip"><Search size={18}/><p>Migration in progress: these links organize the new interface. Existing operations continue in the legacy staging application until individually verified.</p></div></section>}/>
    <Route path="/field-training/*" element={allowedFtep?<FieldTraining access={ftep}/>:<section className="workspace"><h1>Access Restricted</h1><p className="subtle">Your account is not authorized to open the Field Training Program.</p><Link className="text-link" to="/">Return to dashboard</Link></section>}/>
    {pending.map(({path,label})=><Route key={path} path={path} element={<Placeholder title={label}/>}/>)}
    <Route path="*" element={<Navigate to="/" replace/>}/>
   </Routes>
  </main>
  </div>
 </div>
}
