import {NavLink,Navigate,Route,Routes} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {ArrowRight,ClipboardPenLine,FileClock,Users} from 'lucide-react';
import {agencyId,supabase} from '../../lib/supabase';
import {FtoManagement,TraineeList,type FtepSnapshot} from './TrainingManagement';
import {Dors,Performance} from './Dors';
type Access='none'|'fto'|'coordinator'|'command'|'admin';
const tabs=[['overview','Overview'],['trainees','Trainees'],['dors','Daily Observation Reports'],['performance','Performance'],['ftos','FTO Management']] as const;
function Message({title,body}:{title:string;body:string}){return <div className="empty-state"><h2>{title}</h2><p>{body}</p></div>}
function Overview({snapshot}:{snapshot:FtepSnapshot}){
 const active=(snapshot.assignments||[]).filter(a=>!a.ended_at);
 return <div className="ftep-section"><div className="metrics"><div><span>Designated FTOs</span><strong>{snapshot.ftos?.length||0}</strong></div><div><span>Current assignments</span><strong>{active.length}</strong></div><div><span>Authorized trainees</span><strong>{snapshot.trainees?.length??'—'}</strong></div></div><div className="ftep-quick"><NavLink to="../trainees"><Users size={18}/> View trainee assignments <ArrowRight size={16}/></NavLink><NavLink to="../dors"><ClipboardPenLine size={18}/> Daily Observation Reports <ArrowRight size={16}/></NavLink></div><p className="ftep-helper">Live counts reflect the records your account may access. Official DOR records and lifetime category analytics are not yet available in the React application.</p></div>
}
export default function FieldTraining({access,userId}:{access:Access;userId:string}){
 const data=useQuery<FtepSnapshot>({queryKey:['ftep-snapshot',agencyId,userId,access],queryFn:async()=>{if(!supabase||!agencyId)throw new Error('Backend unavailable');const {data,error}=await supabase.rpc('wf_ftep_snapshot',{p_agency:agencyId});if(error)throw error;return data as FtepSnapshot},enabled:access!=='none'&&!!supabase,refetchOnWindowFocus:true});
 const canManage=access==='coordinator'||access==='admin';
 const canDesignateCoordinator=access==='admin';
 return <section className="workspace"><div className="eyebrow">SPECIALIZED PROGRAMS / WORKFORCE MANAGEMENT</div><h1>Field Training</h1><p className="subtle">FTO assignments, trainee progress and evaluations in one authorized workspace.</p><div className="tabs" role="navigation" aria-label="Field Training sections">{tabs.filter(([id])=>id!=='ftos'||canManage).map(([id,label])=><NavLink key={id} to={id} className={({isActive})=>'tab '+(isActive?'active':'')}>{label}</NavLink>)}</div>
 {data.isLoading?<p role="status">Loading authorized Field Training records…</p>:data.error?<Message title="Unable to load Field Training" body="The server did not authorize or complete this request. No protected training records were displayed."/>:!data.data?<Message title="No authorized information" body="The server did not return an accessible Field Training snapshot."/>:
 <Routes><Route index element={<Navigate to="overview" replace/>}/><Route path="overview" element={<Overview snapshot={data.data}/>}/><Route path="trainees" element={<TraineeList snapshot={data.data} canManage={canManage}/>}/><Route path="dors" element={<Dors snapshot={data.data} access={access}/>}/><Route path="performance" element={<Performance snapshot={data.data}/>}/><Route path="ftos" element={canManage?<FtoManagement snapshot={data.data} canDesignateCoordinator={canDesignateCoordinator}/>:<Navigate to="overview" replace/>}/><Route path="*" element={<Navigate to="overview" replace/>}/></Routes>}
 </section>
}
