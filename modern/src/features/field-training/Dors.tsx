import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {ArrowLeft,Check,ChevronDown,ChevronRight,ClipboardPenLine,Save,Send,ShieldAlert} from 'lucide-react';
import {agencyId,supabase} from '../../lib/supabase';
import type {FtepSnapshot,TrainingAssignment} from './TrainingManagement';

type Choice='1'|'2'|'3'|'4'|'5'|'6'|'7'|'NO';
type Score={rating?:Choice;narrative:string;nrt:boolean};
type ScoreMap=Record<string,Score>;
type Category={number:number;name:string;description?:string;group?:string;guidelines?:unknown};
type Catalog={approved:boolean;version_id:string|null;categories:Category[]};
type Report={id:string;report_date:string;status:'draft'|'submitted';training_day:number|null;phase:string|null;fto_person_id:string;ratings:ScoreMap;strength:string;improvement:string;seg_version_id:string|null};
type Review={id:string;dor_id:string;decision:'reviewed'|'needs_followup';comments:string;created_at:string};
type Stats={submitted_dors:number;official_pass_fail:null;category_stats:{category_number:number;seg_version_id:string;average:number;observed:number;below_standard_count:number;latest_score:number}[]};
const ratings:Choice[]=['1','2','3','4','5','6','7','NO'];
const fmt=(date:string)=>{const [y,m,d]=date.split('-');return [m,d,y].join('/')};
function useCall<T>(method:string,args:Record<string,unknown>,enabled=true){
 return useQuery<T>({queryKey:['ftep-dor',method,agencyId,args],enabled:enabled&&!!supabase&&!!agencyId,queryFn:async()=>{if(!supabase||!agencyId)throw Error('Backend unavailable');const {data,error}=await supabase.rpc(method,{p_agency:agencyId,...args});if(error)throw error;return data as T},staleTime:12000});
}
function useRpcMutation(){
 const qc=useQueryClient();
 return useMutation({mutationFn:async({method,args}:{method:string;args:Record<string,unknown>})=>{if(!supabase||!agencyId)throw Error('Backend unavailable');const {data,error}=await supabase.rpc(method,{p_agency:agencyId,...args});if(error)throw error;return data},onSuccess:async()=>{await qc.invalidateQueries({queryKey:['ftep-dor']});await qc.invalidateQueries({queryKey:['ftep-snapshot']})}});
}
function ErrorLine({error}:{error:unknown}){return error?<p className="dor-error" role="alert">{error instanceof Error?error.message:'Request unsuccessful'}</p>:null}
function Notice({children}:{children:React.ReactNode}){return <p className="dor-notice"><ShieldAlert size={16}/>{children}</p>}
function CategoryLabel({cat}:{cat:Category}){return <><span className="dor-number">{String(cat.number).padStart(2,'0')}</span><span className="dor-category-title"><strong>{cat.name}</strong>{cat.description&&<small>{cat.description}</small>}</span></>}
function DorEditor({assignment,catalog,onClose,existing}:{assignment:TrainingAssignment;catalog:Catalog;onClose:()=>void;existing?:Report}){
 const save=useRpcMutation();
 const [date,setDate]=useState(existing?.report_date||new Date().toISOString().slice(0,10));
 const [phase,setPhase]=useState(existing?.phase||'');
 const [day,setDay]=useState(existing?.training_day?.toString()||'');
 const [strength,setStrength]=useState(existing?.strength||'');
 const [improvement,setImprovement]=useState(existing?.improvement||'');
 const [scores,setScores]=useState<ScoreMap>(existing?.ratings||{});
 const [expanded,setExpanded]=useState<number|null>(1);
 const [status,setStatus]=useState('');
 const [busyError,setBusyError]=useState('');
 const complete=Object.values(scores).filter(s=>(s.rating!==undefined&&ratings.includes(s.rating))).length;
 const numerical=Object.values(scores).filter(s=>s.rating!==undefined&&s.rating!=='NO'&&ratings.includes(s.rating)).map(s=>Number(s.rating));
 const average=numerical.length?(numerical.reduce((a,b)=>a+b,0)/numerical.length).toFixed(2):'—';
 function change(n:number,field:keyof Score,value:Choice|string|boolean){
  setScores(old=>({...old,[String(n)]:{rating:old[String(n)]?.rating,narrative:old[String(n)]?.narrative||'',nrt:old[String(n)]?.nrt||false,[field]:value}}));
 }
 async function commit(submit:boolean){
  setBusyError('');setStatus('');
  if(submit&&!catalog.approved){setBusyError('The department-approved 30-category SEG catalog has not been published. You may save a draft, but final submission is blocked.');return}
  if(submit&&complete!==30){setBusyError('Grade or select N/O for all 30 categories before submitting.');return}
  const missing=Object.entries(scores).find(([_,s])=>(Boolean(s.rating)&&['1','2','6','7'].includes(s.rating!)&&s.narrative.trim().length<10) || (Boolean(s.rating)&&s.nrt&&s.narrative.trim().length<10));
  if(submit&&missing){setBusyError('An evaluation scored 1, 2, 6, or 7, or marked NRT, requires a supporting narrative.');setExpanded(Number(missing[0]));return}
  if(submit&&(strength.trim().length<10||improvement.trim().length<10)){setBusyError('Both daily narratives must contain at least 10 characters.');return}
  const payload:Record<string,Score>={};for(const [n,s] of Object.entries(scores)){if(s.rating)payload[n]=s}
  try{
   const result=await save.mutateAsync({method:'wf_ftep_dor_save',args:{p_assignment:assignment.id,p_date:date,p_phase:phase,p_day:day?Number(day):null,p_strength:strength,p_improvement:improvement,p_scores:payload,p_submit:submit}});
   setStatus(submit?'DOR submitted and locked; supervisor review can now begin.':'Draft saved securely in Supabase.');
   if(submit)onClose();
   void result;
  }catch(e){setBusyError(e instanceof Error?e.message:'DOR save was not authorized.')}
 }
 return <div className="dor-workspace"><button className="dor-back" type="button" onClick={onClose}><ArrowLeft size={17}/> DOR list</button><div className="dor-title-row"><div><h2>{existing?'Edit draft DOR':'New Daily Observation Report'}</h2><p>{assignment.trainee_name} · Assigned FTO: {assignment.fto_name}</p></div><span className="dor-progress">{complete}/30 graded</span></div>
 <Notice>Workforce training observations only. Never include CAD/RMS case records, NCIC returns, criminal histories, or identifiable victims/suspects.</Notice>
 {!catalog.approved&&<Notice>Official SEG approval is pending. Ratings may be saved as drafts, but reports cannot be submitted until the approved 30-category guidance is loaded.</Notice>}
 <div className="dor-fields"><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)} required disabled={Boolean(existing)}/></label><label>Training phase<input maxLength={100} placeholder="e.g., Phase 2" value={phase} onChange={e=>setPhase(e.target.value)}/></label><label>Training day<input type="number" min={1} max={365} value={day} onChange={e=>setDay(e.target.value)}/></label></div>
 <div className="dor-summary-line"><strong>Individual performance observations</strong><span>Numeric average: {average} / 7 · N/O excluded</span></div>
 <div className="dor-accordion">{catalog.categories.map(cat=>{const score=scores[String(cat.number)],open=expanded===cat.number;return <section className={'dor-entry '+(open?'open':'')} key={cat.number}><button type="button" className="dor-entry-head" aria-expanded={open} onClick={()=>setExpanded(open?null:cat.number)}><CategoryLabel cat={cat}/><span className={'dor-grade-pill '+(score?.rating?'graded':'')}>{score?.rating==='NO'?'N/O':score?.rating||'Not graded'}</span>{open?<ChevronDown size={17}/>:<ChevronRight size={17}/>}</button>{open&&<div className="dor-entry-detail"><div className="dor-rating" role="group" aria-label={'Rating for '+cat.name}>{ratings.map(choice=><button className={score?.rating===choice?'active':''} key={choice} type="button" aria-pressed={score?.rating===choice} onClick={()=>change(cat.number,'rating',choice)}>{choice==='NO'?'N/O':choice}</button>)}</div>{cat.guidelines&&typeof cat.guidelines==='object'&&Object.keys(cat.guidelines as object).length>0?<details className="dor-seg" open><summary>Standardized Evaluation Guidelines — performance rating guide</summary><div className="dor-guidelines">{Object.entries(cat.guidelines as Record<string,unknown>).map(([key,value])=><div key={key}><strong>{key}</strong><span>{typeof value==='string'?value:JSON.stringify(value)}</span></div>)}</div></details>:<p className="dor-seg-empty">Approved category-specific SEG guidance is pending; no unofficial standard has been invented.</p>}<label className="dor-textarea-label">Observation and coaching notes<textarea rows={3} maxLength={2000} value={score?.narrative||''} onChange={e=>change(cat.number,'narrative',e.target.value)} placeholder="Record observable training performance without criminal case information"/></label><label className="dor-check"><input type="checkbox" checked={score?.nrt||false} onChange={e=>change(cat.number,'nrt',e.target.checked)}/> Non-responsive to training (NRT)</label><div className="dor-row-next"><button type="button" className="dor-next" onClick={()=>setExpanded(cat.number===30?null:cat.number+1)}>{cat.number===30?'Close category':'Next observation'} <ChevronRight size={16}/></button></div></div>}</section>})}</div>
 <div className="dor-narratives"><h3>Daily evaluation narrative</h3><label>Most acceptable performance / strengths<textarea rows={3} maxLength={5000} value={strength} onChange={e=>setStrength(e.target.value)}/></label><label>Least acceptable performance / areas for improvement<textarea rows={3} maxLength={5000} value={improvement} onChange={e=>setImprovement(e.target.value)}/></label></div>
 {busyError&&<p className="dor-error" role="alert">{busyError}</p>}{status&&<p className="dor-success" role="status">{status}</p>}
 <div className="dor-sticky-actions"><span>{complete} of 30 complete</span><button className="dor-outline" type="button" disabled={save.isPending} onClick={()=>void commit(false)}><Save size={17}/>Save draft</button><button className="action-primary" type="button" disabled={save.isPending||!catalog.approved} onClick={()=>void commit(true)}><Send size={16}/>Submit DOR</button></div></div>
}
function ReviewPanel({report,trainee,onDone}:{report:Report;trainee:string;onDone:()=>void}){
 const action=useRpcMutation();const [decision,setDecision]=useState<'reviewed'|'needs_followup'>('reviewed');const[comments,setComments]=useState('');const[error,setError]=useState('');
 async function submit(e:FormEvent){e.preventDefault();setError('');try{await action.mutateAsync({method:'wf_ftep_dor_review',args:{p_dor:report.id,p_decision:decision,p_comments:comments.trim()}});onDone()}catch(x){setError(x instanceof Error?x.message:'Supervisor review was denied')}}
 return <form className="dor-review-form" onSubmit={e=>void submit(e)}><h3>Supervisor review · {fmt(report.report_date)}</h3><p>Submit an append-only review. Original FTO ratings remain unchanged. Supervisory review requires authorized command rank and must not be self-approved.</p><label>Review decision<select value={decision} onChange={e=>setDecision(e.target.value as 'reviewed'|'needs_followup')}><option value="reviewed">Reviewed</option><option value="needs_followup">Follow-up required</option></select></label><label>Supervisor comments<textarea minLength={10} maxLength={2000} required rows={4} value={comments} onChange={e=>setComments(e.target.value)} placeholder="Training review comments; no investigative records"/></label>{error&&<p className="dor-error" role="alert">{error}</p>}<button className="action-primary" disabled={action.isPending} type="submit"><Check size={16}/>Record supervisor review</button><small>Selected trainee reference: {trainee}</small></form>
}
export function Dors({snapshot,access}:{snapshot:FtepSnapshot;access:string}){
 const assignments=(snapshot.assignments||[]);const trainees=useMemo(()=>Array.from(new Map([...((snapshot.trainees||[]).map(p=>[p.id,{id:p.id,name:p.name}] as const)),...assignments.map(a=>[a.trainee_person_id,{id:a.trainee_person_id,name:a.trainee_name}] as const)]).values()).sort((a,b)=>a.name.localeCompare(b.name)),[assignments,snapshot.trainees]);
 const [trainee,setTrainee]=useState(''),[assignmentId,setAssignmentId]=useState(''),[editor,setEditor]=useState(false),[editing,setEditing]=useState<Report|undefined>(undefined),[review,setReview]=useState<Report|null>(null),[detail,setDetail]=useState<Report|null>(null),[view,setView]=useState<'reports'|'create'>('reports');
 useEffect(()=>{if(!trainees.length){setTrainee('');return}if(!trainees.find(t=>t.id===trainee))setTrainee(trainees[0].id)},[trainees,trainee]);
 const catalog=useCall<Catalog>('wf_ftep_dor_catalog',{});
 const history=useCall<Report[]>('wf_ftep_dor_history',{p_trainee:trainee},!!trainee);
 const reviews=useCall<Review[]>('wf_ftep_dor_review_history',{p_trainee:trainee},!!trainee);
 const current=assignments.filter(a=>a.trainee_person_id===trainee&&!a.ended_at);
 const selectedAssignment=current.find(a=>a.id===assignmentId)||current[0];
 const canWrite=access==='fto'||access==='coordinator'||access==='command'||access==='admin';
 const canReview=access==='command';
 if(editor&&selectedAssignment&&catalog.data)return <DorEditor key={selectedAssignment.id+'-'+(editing?.id||'new')} assignment={selectedAssignment} catalog={catalog.data} existing={editing} onClose={()=>{setEditor(false);setEditing(undefined);setView('reports')}}/>;
 const all=history.data||[];
 return <div className="dor-workspace"><div className="dor-title-row"><div><h2>Daily Observation Reports</h2><p>Digital performance records and supervisor review—contained in Field Training.</p></div><span className="dor-progress">{all.filter(r=>r.status==='submitted').length} submitted</span></div>
 <div className="dor-filter-line"><label>Trainee<select value={trainee} onChange={e=>{setTrainee(e.target.value);setReview(null);setDetail(null)}}>{trainees.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><button className="dor-outline" onClick={()=>{setView(view==='create'?'reports':'create');setReview(null);setDetail(null)}}>{view==='create'?'Show reports':'New DOR'}</button></div>
 {view==='create'&&<div className="dor-new-panel"><h3>Start a Daily Observation Report</h3>{current.length?<><label>Current FTO assignment<select value={selectedAssignment?.id||''} onChange={e=>setAssignmentId(e.target.value)}>{current.map(a=><option value={a.id} key={a.id}>{a.trainee_name} · FTO {a.fto_name}</option>)}</select></label><button className="action-primary" disabled={!canWrite||!catalog.data} onClick={()=>{setEditing(undefined);setEditor(true)}}>Open 30-category editor</button><p className="dor-muted">Only the designated, currently assigned FTO can save or submit. Other users may view authorized reports but cannot grade on an FTO's behalf.</p></>:<p>No active assignment exists for this trainee. Assign a designated FTO first.</p>}</div>}
 {!trainees.length?<p className="dor-muted">No trainee assignments are available to your account.</p>:history.isLoading?<p role="status">Loading protected report history…</p>:<ErrorLine error={history.error}/>}
 {all.length>0&&<div className="dor-history">{all.map(r=>{const linked=reviews.data?.filter(x=>x.dor_id===r.id)||[];return <div key={r.id} className="dor-history-item"><div className="dor-report-main"><strong>{fmt(r.report_date)}</strong><span>Day {r.training_day||'—'} · {r.phase||'Phase not set'}</span></div><span className={'dor-grade-pill '+(r.status==='submitted'?'graded':'')}>{r.status}</span><button className="dor-link" type="button" onClick={()=>{setDetail(detail?.id===r.id?null:r);setReview(null)}}>{detail?.id===r.id?'Hide':'View'}</button>{r.status==='draft'&&selectedAssignment?.id&&r.fto_person_id===selectedAssignment.fto_person_id&&<button className="dor-link" type="button" onClick={()=>{setAssignmentId(r.fto_person_id===selectedAssignment.fto_person_id?selectedAssignment.id:'');setEditing(r);setEditor(true)}}>Edit draft</button>}{r.status==='submitted'&&canReview&&<button className="dor-link" type="button" onClick={()=>{setReview(review?.id===r.id?null:r);setDetail(null)}}>Supervisor review</button>}{linked.length>0&&<span className="dor-review-status">{linked.length} review(s)</span>}{detail?.id===r.id&&<div className="dor-report-detail"><h4>Submitted FTO observations</h4><p><strong>Strengths:</strong> {r.strength||'—'}</p><p><strong>Areas for improvement:</strong> {r.improvement||'—'}</p><div className="dor-mini-scores">{Object.entries(r.ratings||{}).sort((a,b)=>Number(a[0])-Number(b[0])).map(([key,s])=><span key={key}>#{key}: {s.rating==='NO'?'N/O':s.rating}</span>)}</div>{linked.map(v=><p key={v.id}><strong>Supervisor:</strong> {v.decision==='reviewed'?'Reviewed':'Follow-up required'} — {v.comments}</p>)}</div>}{review?.id===r.id&&<ReviewPanel report={r} trainee={trainee} onDone={()=>setReview(null)}/>}</div>})}</div>}
 {!history.isLoading&&!all.length&&trainees.length>0&&<p className="dor-muted">No DORs have been saved for this trainee yet.</p>}
 {catalog.error&&<ErrorLine error={catalog.error}/>}
 {!catalog.data?.approved&&<Notice>The department-approved 30-category SEG is not yet available. Drafts can be saved; final submissions are blocked by the database.</Notice>}
 </div>
}
export function Performance({snapshot}:{snapshot:FtepSnapshot}){
 const trainees=Array.from(new Map([...((snapshot.trainees||[]).map(p=>[p.id,{id:p.id,name:p.name}] as const)),...(snapshot.assignments||[]).map(a=>[a.trainee_person_id,{id:a.trainee_person_id,name:a.trainee_name}] as const)]).values());
 const [trainee,setTrainee]=useState('');
 useEffect(()=>{if(trainees.length&&!trainees.find(t=>t.id===trainee))setTrainee(trainees[0].id)},[trainee,trainees.map(x=>x.id).join(',')]);
 const progress=useCall<Stats>('wf_ftep_dor_progress',{p_trainee:trainee},!!trainee);
 const catalog=useCall<Catalog>('wf_ftep_dor_catalog',{});
 const map=new Map((catalog.data?.categories||[]).map(c=>[c.number,c.name]));
 const rows=progress.data?.category_stats||[];
 const observedCount=rows.reduce((n,r)=>n+r.observed,0);
 const scoreAvg=observedCount?rows.reduce((sum,r)=>sum+r.average*r.observed,0)/observedCount:null;
 return <div className="dor-workspace"><div className="dor-title-row"><div><h2>Trainee performance</h2><p>Cumulative scores from submitted, protected DOR records only.</p></div></div><div className="dor-filter-line"><label>Trainee<select value={trainee} onChange={e=>setTrainee(e.target.value)}>{trainees.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label></div>
 {progress.isLoading?<p role="status">Calculating submitted evaluation history…</p>:<ErrorLine error={progress.error}/>}
 {progress.data&&<><div className="metrics"><div><span>Submitted DORs</span><strong>{progress.data.submitted_dors}</strong></div><div><span>Observed numerical ratings</span><strong>{observedCount}</strong></div><div><span>Overall numerical average</span><strong>{scoreAvg==null?'—':scoreAvg.toFixed(2)}</strong></div></div><Notice>Category averages are informational indicators, not official pass/fail or release decisions. N/O is excluded. Scores are tracked by SEG version and should not be combined across incompatible standards without review.</Notice><div className="dor-performance-list">{rows.map(r=><div className="dor-performance-row" key={r.seg_version_id+'-'+r.category_number}><div><strong>{String(r.category_number).padStart(2,'0')} · {map.get(r.category_number)||'Observation'}</strong><small>{r.observed} scored · {r.below_standard_count} ratings below 4 · Latest {r.latest_score}/7</small></div><span className={'dor-grade-pill '+(r.average<4?'below':'graded')}>{r.average.toFixed(2)} avg</span></div>)}{!rows.length&&<p className="dor-muted">No submitted, approved-SEG numerical ratings are available yet.</p>}</div></>}
 </div>
}
