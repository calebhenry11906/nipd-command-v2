import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFtepAccess, getFtepSnapshot } from "@/features/field-training/api";
import { useAuth } from "@/app/providers/AuthProvider";
export function useFtepAccess(){
 const {user}=useAuth();
 return useQuery({queryKey:["ftep-access",user?.id],queryFn:getFtepAccess,enabled:!!user,refetchInterval:30_000,staleTime:0,retry:false});
}
export function useFtepSnapshot(){
 const {user}=useAuth();
 const access=useFtepAccess();
 return useQuery({queryKey:["ftep-snapshot",user?.id],queryFn:getFtepSnapshot,enabled:!!user&&access.data?.can_view===true,refetchOnWindowFocus:true,staleTime:0,retry:false});
}
export function useRefreshFtep(){
 const qc=useQueryClient();
 return ()=>qc.invalidateQueries({queryKey:["ftep"]});
}
