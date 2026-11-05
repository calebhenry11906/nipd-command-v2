import {useState,type FormEvent} from 'react';
import {LockKeyhole,Mail,ArrowLeft,LoaderCircle} from 'lucide-react';
import {configured,supabase} from '../../lib/supabase';

export default function SignIn(){
 const[email,setEmail]=useState(''),[code,setCode]=useState(''),[step,setStep]=useState<'email'|'code'>('email');
 const[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase||busy)return;setBusy(true);setError('');setNotice('');
  try{
   if(step==='email'){
    const address=email.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))throw Error('Enter a valid work email address.');
    const {error:sendError}=await supabase.auth.signInWithOtp({email:address,options:{shouldCreateUser:false}});
    if(sendError)throw sendError;
    setEmail(address);setStep('code');setNotice('If this address belongs to an existing approved account, check your inbox for the sign-in code.');
   }else{
    if(!/^\d{6}$/.test(code))throw Error('Enter the six-digit code from your email.');
    const {error:verifyError}=await supabase.auth.verifyOtp({email:email.trim(),token:code,type:'email'});
    if(verifyError)throw verifyError;
    setCode('');setNotice('Signed in. Verifying department access…');
   }
  }catch(e){setError(e instanceof Error?e.message:'Sign-in was unsuccessful. Try again.')}
  finally{setBusy(false)}
 }
 return <div className="auth-screen"><div className="auth-brand"><div className="brand-mark">N</div><div><strong>NIPD Command</strong><span>Workforce Management · Staging</span></div></div><div className="auth-panel"><div className="auth-icon"><LockKeyhole size={23}/></div><h1>Employee sign-in</h1><p className="subtle">Access department workforce tools with your authorized account. This staging application is not approved for operational use.</p>{!configured?<div className="notice" role="alert">Supabase configuration is missing. Sign-in is unavailable until the staging environment is configured.</div>:<form onSubmit={e=>void submit(e)} className="auth-form">{step==='email'?<label>Work email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@department.gov" required autoComplete="email" maxLength={254}/></label>:<><label>Six-digit email code<input inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000" required/></label><button className="text-link auth-back" type="button" onClick={()=>{setStep('email');setCode('');setError('');setNotice('')}}><ArrowLeft size={16}/> Use another email address</button></>}{error&&<p role="alert" className="form-error">{error}</p>}{notice&&<p role="status" className="form-notice">{notice}</p>}<button className="action-primary" type="submit" disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:<Mail size={17}/>} {step==='email'?'Send sign-in code':'Verify code'}</button></form>}<div className="auth-caption">Existing approved accounts only · No public registration · Workforce data only · Do not enter CJI, CAD or RMS records</div></div></div>
}
