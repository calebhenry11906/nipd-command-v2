/* Read-only view for consolidated submissions. */
(()=>{const host=document.getElementById("module");const panel=document.createElement("section");panel.id="nipdMyRequests";panel.className="ops-screen";panel.hidden=true;host?.append(panel);async function render(){
 panel.replaceChildren();
 const title=document.createElement("h2");title.textContent="My Requests";
 const msg=document.createElement("p");msg.textContent="Loading your authorized submissions…";
 panel.append(title,msg);
 try {
  const client=window.NIPD_SECURE_CLIENT;
  if(!client){msg.textContent="Secure data connection is unavailable.";return}
  const {data:{user}}=await client.auth.getUser();
  if(!user){msg.textContent="Sign in through Workforce Staging to view your own requests.";return}
  const {data,error}=await client.rpc("wf_my_requests_summary",{p_agency:window.NIPD_SECURE_AGENCY});
  if(error){msg.textContent="Request records could not be verified.";return}
  window.NIPD_RENDER_REQUEST_LIST?.(panel,Array.isArray(data)?data:[]);
 }catch(_){msg.textContent="Unable to retrieve requests."}
}
const previous=window.navigate;if(typeof previous==="function")window.navigate=function(id){previous(id);panel.hidden=id!=="requests";if(id==="requests")render()};
})();