import { supabase, agencyId } from "@/lib/supabase";
export type FtepLevel="none"|"fto"|"command"|"coordinator"|"admin";
export type FtepAccess={level:FtepLevel;can_view:boolean;can_manage_ftos:boolean;can_designate_coordinator:boolean};
export type Person={id:string;person_id?:string;name:string;rank:string;rcn?:string;certified?:boolean};
export type Assignment={id:string;trainee_person_id:string;trainee_name:string;fto_person_id:string;fto_name:string;assigned_at:string;ended_at:string|null};
export type FtepSnapshot={access_level:FtepLevel;coordinator:Person[];ftos:Person[];trainees:Person[];sworn_fto_candidates:Person[];eligible_people:Person[];assignments:Assignment[];history:{action:string;reason:string|null;at:string}[]};
function client(){if(!supabase||!agencyId)throw new Error("Staging Supabase connection is not configured");return supabase}
export async function getFtepAccess():Promise<FtepAccess>{
 const {data,error}=await client().rpc("wf_ftep_my_access",{p_agency:agencyId});
 if(error)throw error;
 return data as FtepAccess;
}
export async function getFtepSnapshot():Promise<FtepSnapshot>{
 const {data,error}=await client().rpc("wf_ftep_snapshot",{p_agency:agencyId});
 if(error)throw error;
 return data as FtepSnapshot;
}
async function command(name:string,args:Record<string,unknown>){
 const {data,error}=await client().rpc(name,{p_agency:agencyId,...args});
 if(error)throw error;
 return data as unknown;
}
export const setFto=(person:string,enable:boolean,reason:string)=>command("wf_ftep_set_fto",{p_person:person,p_enable:enable,p_reason:reason});
export const setCoordinator=(person:string|null,reason:string)=>command("wf_ftep_set_coordinator",{p_person:person,p_reason:reason});
export const assignTrainee=(trainee:string,fto:string,reason:string)=>command("wf_ftep_assign_trainee",{p_trainee:trainee,p_fto:fto,p_reason:reason});
export const endAssignment=(assignment:string,reason:string)=>command("wf_ftep_end_trainee_assignment",{p_assignment:assignment,p_reason:reason});

export type DorRating={rating:string;narrative:string;nrt:boolean};
export type DorHistoryItem={
 id:string;report_date:string;status:"draft"|"submitted";training_day:number|null;phase:string|null;
 fto_person_id:string;seg_version_id:string|null;strength:string;improvement:string;
 ratings:Record<string,DorRating>;
};
export type DorCategoryProgress={
 seg_version_id:string;category_number:number;average:number|null;observed:number;
 below_standard_count:number;latest_score:number|null;
};
export type DorProgress={submitted_dors:number;category_stats:DorCategoryProgress[];official_pass_fail:null};
export async function saveDor(params:{
 assignment:string;date:string;phase:string;day:number|null;strength:string;improvement:string;
 scores:Record<string,DorRating>;submit:boolean;
}):Promise<{id:string;status:string;saved_scores:number}>{
 const {data,error}=await client().rpc("wf_ftep_dor_save",{
 p_agency:agencyId,p_assignment:params.assignment,p_date:params.date,p_phase:params.phase,
 p_day:params.day,p_strength:params.strength,p_improvement:params.improvement,
 p_scores:params.scores,p_submit:params.submit
 });
 if(error)throw error;
 return data as {id:string;status:string;saved_scores:number};
}
export async function getDorHistory(trainee:string):Promise<DorHistoryItem[]>{
 const {data,error}=await client().rpc("wf_ftep_dor_history",{p_agency:agencyId,p_trainee:trainee});
 if(error)throw error;
 return data as DorHistoryItem[];
}
export async function getDorProgress(trainee:string):Promise<DorProgress>{
 const {data,error}=await client().rpc("wf_ftep_dor_progress",{p_agency:agencyId,p_trainee:trainee});
 if(error)throw error;
 return data as DorProgress;
}
