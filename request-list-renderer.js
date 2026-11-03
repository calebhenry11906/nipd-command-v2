/* One read-only request list; originating modules own records. */
window.NIPD_RENDER_REQUEST_LIST=(host,items)=>{
 host.querySelector("p")?.remove();
 const node=(t,v)=>{const e=document.createElement(t);if(v!==undefined)e.textContent=v;return e};
 if(!items.length){
  const empty=node("section");empty.className="ops-empty-panel";
  empty.append(node("h3","You're all caught up"),node("p","No submitted requests are recorded for this account yet. Start a request in its proper department module, and its status will appear here automatically."));
  const actions=node("div");actions.className="ops-empty-actions";
  for(const [title,destination] of [["Leave & Training","leave"],["Shift Assignment","schedule"],["Security Details","security"]]){
   const b=node("button",title+" →");b.type="button";b.onclick=()=>window.navigate?.(destination);actions.append(b);
  }empty.append(actions);host.append(empty);return;
 }
 const info=node("div");info.className="ops-summary";
 const pending=items.filter(x=>!["approved","denied","cancelled","completed"].includes(x.status)).length;
 for(const [label,num] of [["Total requests",items.length],["Awaiting decision",pending],["Approved",items.filter(x=>x.status==="approved").length]]){
  const tile=node("div");tile.className="ops-stat";tile.append(node("strong",String(num)),node("span",label));info.append(tile);
 }host.append(info);
 const search=node("input");search.placeholder="Search my requests";search.type="search";host.append(search);
 const source=node("select");source.setAttribute("aria-label","Filter by originating module");for(const x of ["All",...new Set(items.map(x=>x.source))]){const option=node("option",x);source.append(option)}host.append(source);
 const list=node("div");list.className="ops-list";host.append(list);
 const draw=()=>{
 list.replaceChildren();
 const found=items.filter(x=>(source.value==="All"||x.source===source.value)&&[x.kind,x.source,x.status].join(" ").toLowerCase().includes(search.value.toLowerCase()));
 if(!found.length){list.append(node("p",items.length?"No matching requests.":"No requests found for your account."));return}
 for(const x of found){
 const card=node("details");card.className="ops-item";
 const statusText={supervisor:"Awaiting Sergeant Review",final:"Awaiting Lieutenant Review",approved:"Approved",denied:"Denied",cancelled:"Cancelled",pending:"Pending"}[x.status]||String(x.status||"In Progress").replaceAll("_"," ");
 const summary=node("summary",(x.kind||"Request")+" · "+x.source+" · "+statusText);card.append(summary);
 const body=node("div");body.append(node("p","Submitted: "+new Date(x.created_at).toLocaleDateString()),node("p","Last updated: "+new Date(x.updated_at).toLocaleDateString()),node("p","Reference: "+x.id));
 const button=node("button","Open original module →");button.type="button";button.onclick=()=>window.navigate?.(x.source==="Leave & Training"?"leave":x.source==="Security Details"?"security":"schedule");body.append(button);
 card.append(body);list.append(card);
 }
 };search.oninput=draw;source.onchange=draw;draw();
 host.append(node("p","Read-only tracking. Equipment requests are not yet connected to a protected source."));
};