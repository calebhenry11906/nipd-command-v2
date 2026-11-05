import {useState,type FormEvent} from 'react';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {AlertCircle,CheckCircle2,UserPlus,UserRoundCheck,UserX} from 'lucide-react';
import {agencyId,supabase} from '../../lib/supabase';

export type StaffPerson={id:string;person_id?:string;name:string;rank?:string;rcn?:string};
export type TrainingAssignment={id:string;trainee_person_id:string;fto_person_id:string;trainee_name:string;fto_name:string;ended_at?:string|null;assigned_at?:string};
export type FtepSnapshot={
 access_level?:string;
 trainees?:StaffPerson[];
 sworn_fto_candidates?:StaffPerson[];
 eligible_people?:StaffPerson[];
 ftos?:StaffPerson[];
 coordinator?:StaffPerson[];
 assignments?:TrainingAssignment[];
 history?:{at:string;action:string;reason?:string}[];
};
type ActionName='wf_ftep_set_fto'|'wf_ftep_assign_trainee'|'wf_ftep_end_trainee_assignment'|'wf_ftep_set_coordinator';

function useFtepAction(){
 const queryClient=useQueryClient();
 return useMutation({
 mutationFn:async ({name,args}:{name:ActionName;args:Record<string,string|boolean|null>})=>{
  if(!supabase||!agencyId)throw new Error('Supabase staging is not configured.');
  const {error}=await supabase.rpc(name,{p_agency:agencyId,...args});
  if(error)throw error;
 },
 onSuccess:async()=>{await queryClient.invalidateQueries({queryKey:['ftep-snapshot',agencyId]})}
 });
}
function Feedback({error,success}:{error?:string;success?:string}){
 return <>{error&&<p className="ftep-feedback error" role="alert"><AlertCircle size={16}/>{error}</p>}{success&&<p className="ftep-feedback success" role="status"><CheckCircle2 size={16}/>{success}</p>}</>;
}
function PersonSelect({label,people,value,onChange,emptyText,allowBlank=false}:{label:string;people:StaffPerson[];value:string;onChange:(value:string)=>void;emptyText:string;allowBlank?:boolean}){
 return <label className="ftep-field">{label}<select value={value} onChange={e=>onChange(e.target.value)} required={!allowBlank}><option value="">{emptyText}</option>{people.map(p=><option key={p.id||p.person_id} value={p.id||p.person_id}>{p.name}{p.rank?' · '+p.rank:''}{p.rcn?' · RCN '+p.rcn:''}</option>)}</select></label>
}
export function TraineeList({snapshot,canManage}:{snapshot:FtepSnapshot;canManage:boolean}){
 const action=useFtepAction();
 const [section,setSection]=useState<'list'|'assign'>('list');
 const [trainee,setTrainee]=useState(''),[fto,setFto]=useState(''),[reason,setReason]=useState(''),[message,setMessage]=useState('');
 const trainees=snapshot.trainees||[],assignments=snapshot.assignments||[],active=assignments.filter(a=>!a.ended_at);
 const submit=async(e:FormEvent)=>{e.preventDefault();setMessage('');if(reason.trim().length<5){setMessage('Provide an assignment reason of at least five characters.');return}
 try{await action.mutateAsync({name:'wf_ftep_assign_trainee',args:{p_trainee:trainee,p_fto:fto,p_reason:reason.trim()}});setMessage('Assignment saved to the authorized training record.');setReason('')}catch{/* error shown from mutation */}};
 const end=async(a:TrainingAssignment)=>{const reason=window.prompt('Reason for ending '+a.trainee_name+'\'s assignment (at least five characters):');if(!reason||reason.trim().length<5)return;setMessage('');try{await action.mutateAsync({name:'wf_ftep_end_trainee_assignment',args:{p_assignment:a.id,p_reason:reason.trim()}});setMessage('Training assignment closed and audit history updated.')}catch{/* error displayed */}};
 return <div className="ftep-section"><div className="ftep-section-header"><div><h2>Trainees and assignments</h2><p>Assignments are read from the protected Field Training database. Only enrolled trainees may be selected.</p></div><span className="ftep-small-count">{active.length} active</span></div>
 <div className="ftep-subnavigation"><button type="button" className={section==='list'?'active':''} onClick={()=>setSection('list')}>Current assignments</button>{canManage&&<button type="button" className={section==='assign'?'active':''} onClick={()=>setSection('assign')}>Assign an FTO</button>}</div>
 {section==='list'&&<div className="ftep-roster">{active.length?active.map(a=><div className="ftep-roster-line" key={a.id}><div className="ftep-roster-avatar">{a.trainee_name?.charAt(0)||'T'}</div><div className="ftep-roster-main"><strong>{a.trainee_name}</strong><span>Assigned FTO: {a.fto_name}</span></div><span className="ftep-status-tag">Active</span>{canManage&&<button type="button" className="ftep-link-action" disabled={action.isPending} onClick={()=>void end(a)}>End assignment</button>}</div>):<p className="ftep-list-empty">No active Field Training assignments are available for this account.</p>}</div>}
 {canManage&&section==='assign'&&<form className="ftep-inline-form" onSubmit={e=>void submit(e)}><h3>Assign an FTO</h3><div className="ftep-form-grid"><PersonSelect label="Enrolled trainee" people={trainees} value={trainee} onChange={setTrainee} emptyText="Choose trainee"/><PersonSelect label="Designated FTO" people={snapshot.ftos||[]} value={fto} onChange={setFto} emptyText="Choose active FTO"/></div><label className="ftep-field">Assignment reason<input value={reason} onChange={e=>setReason(e.target.value)} minLength={5} maxLength={500} required placeholder="Reason for assigning this FTO"/></label><button type="submit" className="action-primary" disabled={action.isPending||!trainees.length||!(snapshot.ftos||[]).length}><UserPlus size={17}/>{action.isPending?'Saving…':'Save assignment'}</button><Feedback error={action.error?.message} success={message}/></form>}
 {canManage&&<p className="ftep-helper">Trainee enrollment is controlled by the existing server-side register. Never enter trainee names as free text or change personnel rank to alter eligibility.</p>}
 </div>
}
export function FtoManagement({snapshot,canDesignateCoordinator}:{snapshot:FtepSnapshot;canDesignateCoordinator:boolean}){
 const [section,setSection]=useState<'roster'|'designation'|'coordinator'>('roster');
 const action=useFtepAction(),[person,setPerson]=useState(''),[reason,setReason]=useState(''),[message,setMessage]=useState(''),[coordinator,setCoordinator]=useState(''),[coordReason,setCoordReason]=useState('');
 const doFto=async(enable:boolean)=>{setMessage('');if(!person||reason.trim().length<5){setMessage('Choose an eligible sworn employee and enter a reason of at least five characters.');return}try{await action.mutateAsync({name:'wf_ftep_set_fto',args:{p_person:person,p_enable:enable,p_reason:reason.trim()}});setMessage(enable?'FTO designation granted.':'FTO designation revoked.');setReason('')}catch{/* action error shown */}};
 const doCoordinator=async(e:FormEvent)=>{e.preventDefault();setMessage('');try{await action.mutateAsync({name:'wf_ftep_set_coordinator',args:{p_person:coordinator||null,p_reason:coordReason.trim()}});setMessage('Coordinator designation updated.');setCoordReason('')}catch{/* action error shown */}};
 return <div className="ftep-section"><div className="ftep-section-header"><div><h2>FTO Management</h2><p>Field Training designations do not change employee rank or grant unrelated supervisory access.</p></div></div><div className="ftep-subnavigation"><button className={section==='roster'?'active':''} onClick={()=>setSection('roster')} type="button">Current FTOs</button><button className={section==='designation'?'active':''} onClick={()=>setSection('designation')} type="button">Manage designations</button>{canDesignateCoordinator&&<button className={section==='coordinator'?'active':''} onClick={()=>setSection('coordinator')} type="button">Coordinator</button>}</div>{section==='roster'&&<div className="ftep-roster">{(snapshot.ftos||[]).map(p=><div className="ftep-roster-line" key={p.id||p.person_id}><div className="ftep-roster-avatar"><UserRoundCheck size={17}/></div><div className="ftep-roster-main"><strong>{p.name}</strong><span>{p.rank||'Eligible sworn employee'}{p.rcn?' · RCN '+p.rcn:''}</span></div><span className="ftep-status-tag">Designated FTO</span></div>)}{!snapshot.ftos?.length&&<p className="ftep-list-empty">No active Field Training Officers designated.</p>}</div>}
 {section==='designation'&&<div className="ftep-inline-form"><h3>Change FTO designation</h3><PersonSelect label="Eligible sworn employee" people={snapshot.sworn_fto_candidates||[]} value={person} onChange={setPerson} emptyText="Select employee"/><label className="ftep-field">Required reason<input value={reason} onChange={e=>setReason(e.target.value)} minLength={5} maxLength={500} required placeholder="Reason for designation change"/></label><div className="ftep-action-row"><button type="button" className="action-primary" disabled={action.isPending} onClick={()=>void doFto(true)}><UserPlus size={16}/>Grant FTO</button><button type="button" className="ftep-outline-button" disabled={action.isPending} onClick={()=>void doFto(false)}><UserX size={16}/>Revoke FTO</button></div><Feedback error={action.error?.message} success={message}/><p className="ftep-helper">Certification records are maintained privately outside NIPD Command. The server independently checks FTO and Coordinator authority.</p></div>}
 {canDesignateCoordinator&&section==='coordinator'&&<form className="ftep-inline-form" onSubmit={e=>void doCoordinator(e)}><h3>Primary Field Training Coordinator</h3><PersonSelect label="Coordinator employee" people={snapshot.eligible_people||[]} value={coordinator} onChange={setCoordinator} emptyText="Select / use blank to revoke" allowBlank/><label className="ftep-field">Required reason<input minLength={5} maxLength={500} value={coordReason} onChange={e=>setCoordReason(e.target.value)} required/></label><button type="submit" className="action-primary" disabled={action.isPending}>Update Coordinator</button></form>}
 </div>
}
