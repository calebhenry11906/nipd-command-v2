/* One read-only request list; originating modules own records. */
window.NIPD_RENDER_REQUEST_LIST=(host,items)=>{
 host.querySelector("p")?.remove();
 const node=(t,v)=>{const e=document.createElement(t);if(v!==undefined)e.textContent=v;return e};
 const info=node("p",items.length+" submissions · "+items.filter(x=>!["approved","denied","cancelled"].includes(x.status)).length+" pending");host.append(info);
 const search=node("input");search.placeholder="Search my requests";search.type="search";host.append(search);
 const source=node("select");source.setAttribute("aria-label","Filter by originating module");for(const x of ["All",...new Set(items.map(x=>x.source))]){const option=node("option",x);source.append(option)}host.append(source);
 const list=node("div");list.className="ops-list";host.append(list);
 const draw=()=>{
 list.replaceChildren();
 const found=items.filter(x=>(source.value==="All"||x.source===source.value)&&[x.kind,x.source,x.status].join(" ").toLowerCase().includes(search.value.toLowerCase()));
 if(!found.length){list.append(node("p",items.length?"No matching requests.":"No requests found for your account."));return}
 for(const x of found){
 const card=node("details");card.className="ops-item";
 const summary=node("summary",(x.kind||"Request")+" · "+x.source+" · "+x.status);card.append(summary);
 const body=node("div");body.append(node("p","Submitted: "+new Date(x.created_at).toLocaleDateString()),node("p","Last updated: "+new Date(x.updated_at).toLocaleDateString()),node("p","Reference: "+x.id));
 const button=node("button","Open original module →");button.type="button";button.onclick=()=>window.navigate?.(x.source==="Leave & Training"?"leave":x.source==="Security Details"?"security":"schedule");body.append(button);
 card.append(body);list.append(card);
 }
 };search.oninput=draw;source.onchange=draw;draw();
 host.append(node("p","Read-only tracking. Equipment requests are not yet connected to a protected source."));
};