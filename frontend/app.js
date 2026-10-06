const configuredApi = String(window.AI_LEARNING_HUB_CONFIG?.API_BASE_URL || "").trim();
const sameOriginApi = `${window.location.origin}/api`;
const API = (configuredApi || (window.location.protocol === "file:" ? "" : sameOriginApi)).replace(/\\/$/, "");

function requireApi() {
  if (!API) {
    throw new Error("Frontend đang mở trực tiếp bằng HTML. Hãy mở frontend/config.js và điền API_BASE_URL bằng link PUBLIC của backend.");
  }
}
const $=id=>document.getElementById(id);
const key=k=>`alh_${currentUser?.id||"guest"}_${k}`;
let currentUser=null, timer=null, seconds=1500;

function toast(t){const e=$("toast");e.textContent=t;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),2200)}
function msg(id,text,ok=false){const e=$(id);e.textContent=text;e.style.color=ok?"#14804a":"#c43d4b"}
function switchAuth(mode){const login=mode==="login";$("loginForm").classList.toggle("hidden",!login);$("registerForm").classList.toggle("hidden",login);$("loginTab").classList.toggle("active",login);$("registerTab").classList.toggle("active",!login)}
$("loginTab").onclick=()=>switchAuth("login");$("registerTab").onclick=()=>switchAuth("register");

async function api(path,options={}){\n  requireApi();
  const headers={...(options.headers||{})};if(options.body && !(options.body instanceof FormData)) headers["Content-Type"]="application/json";const token=localStorage.getItem("token");if(token)headers.Authorization=`Bearer ${token}`;
  const r=await fetch(API+path,{...options,headers});let d={};try{d=await r.json()}catch{}
  if(!r.ok)throw new Error(d.message||`Lỗi ${r.status}`);return d
}
$("registerForm").addEventListener("submit",async e=>{e.preventDefault();const name=$("registerName").value.trim(),email=$("registerEmail").value.trim(),password=$("registerPassword").value,confirm=$("registerConfirm").value;if(password!==confirm)return msg("registerMessage","Mật khẩu nhập lại không khớp.");try{const d=await api("/auth/register",{method:"POST",body:JSON.stringify({name,email,password})});saveSession(d);toast("Đăng ký thành công");}catch(x){msg("registerMessage",x.message)}});
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();try{const d=await api("/auth/login",{method:"POST",body:JSON.stringify({email:$("loginEmail").value.trim(),password:$("loginPassword").value})});saveSession(d);toast("Đăng nhập thành công");}catch(x){msg("loginMessage",x.message)}});

function saveSession(d){localStorage.setItem("token",d.token);localStorage.setItem("user",JSON.stringify(d.user));currentUser=d.user;showApp()}
function showApp(){const u=currentUser;$("authPage").classList.add("hidden");$("appPage").classList.remove("hidden");$("welcomeTitle").textContent=`Xin chào, ${u.name} 👋`;$("profileName").textContent=u.name;$("profileInitial").textContent=u.name[0].toUpperCase();$("bigAvatar").textContent=u.name[0].toUpperCase();$("profileFullName").textContent=u.name;$("profileEmail").textContent=u.email;$("accountRole").textContent=(u.role||"user").toUpperCase();loadLocal();updateStats()}
$("logoutBtn").onclick=()=>{localStorage.removeItem("token");localStorage.removeItem("user");currentUser=null;$("appPage").classList.add("hidden");$("authPage").classList.remove("hidden");switchAuth("login")};

document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>go(b.dataset.section));
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
function go(id){document.querySelectorAll(".section").forEach(s=>s.classList.remove("active-section"));$(id).classList.add("active-section");document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active",n.dataset.section===id));window.scrollTo({top:0,behavior:"smooth"})}

document.addEventListener("click",e=>{const b=e.target.closest(".btn-animate");if(!b)return;const r=document.createElement("span"),rect=b.getBoundingClientRect(),size=Math.max(rect.width,rect.height);r.className="ripple";r.style.width=r.style.height=size+"px";r.style.left=(e.clientX-rect.left-size/2)+"px";r.style.top=(e.clientY-rect.top-size/2)+"px";b.appendChild(r);setTimeout(()=>r.remove(),600)});

async function chatSend(text){const box=$("messages"),u=document.createElement("div");u.className="msg user";u.textContent=text;box.appendChild(u);box.scrollTop=box.scrollHeight;const wait=document.createElement("div");wait.className="msg bot";wait.textContent="Đang suy nghĩ...";box.appendChild(wait);try{const d=await api("/ai/chat",{method:"POST",body:JSON.stringify({message:text})});wait.textContent=d.reply}catch(e){wait.textContent=e.message||"Không thể kết nối AI."}box.scrollTop=box.scrollHeight}
$("chatForm").addEventListener("submit",e=>{e.preventDefault();const i=$("chatInput"),t=i.value.trim();if(!t)return; i.value="";chatSend(t)});
$("clearChat").onclick=()=>{$("messages").innerHTML='<div class="msg bot"><b>AI Learning Hub</b><br>Đoạn chat đã được xóa. Bạn muốn học gì hôm nay?</div>'};

function loadLocal(){renderTasks();loadLibrary();$("dailyGoal").value=localStorage.getItem(key("goal"))||"";updateTimer()}
function getTasks(){try{return JSON.parse(localStorage.getItem(key("tasks"))||"[]")}catch{return[]}}
function saveTasks(a){localStorage.setItem(key("tasks"),JSON.stringify(a));renderTasks();updateStats()}
function renderTasks(){const a=getTasks(),box=$("taskList");box.innerHTML=a.length?a.map((t,i)=>`<div class="list-item ${t.done?"done":""}"><div><input type="checkbox" data-task="${i}" ${t.done?"checked":""}> <span class="task-title">${esc(t.title)}</span>${t.date?` <small class="muted">• ${esc(t.date)}</small>`:""}</div><button class="small-btn" data-del-task="${i}">Xóa</button></div>`).join(""):'<p class="muted">Chưa có bài tập. Thêm việc đầu tiên của bạn.</p>'}
$("taskForm").addEventListener("submit",e=>{e.preventDefault();const title=$("taskInput").value.trim();if(!title)return;const a=getTasks();a.push({title,date:$("taskDate").value,done:false});saveTasks(a);$("taskInput").value="";$("taskDate").value="";toast("Đã thêm bài tập")});
$("taskList").addEventListener("change",e=>{if(e.target.dataset.task!==undefined){const a=getTasks();a[+e.target.dataset.task].done=e.target.checked;saveTasks(a)}});$("taskList").addEventListener("click",e=>{if(e.target.dataset.delTask!==undefined){const a=getTasks();a.splice(+e.target.dataset.delTask,1);saveTasks(a)}});

function updateStats(){
  const a=getTasks(),done=a.filter(x=>x.done).length,total=a.length;
  $("statDone").textContent=done;
  $("statTasks").textContent=total-done;
  loadLibraryStats();
  const p=total?Math.round(done/total*100):0;
  $("progressBar").style.width=p+"%";
  $("progressText").textContent=p+"%";
}
function formatSize(n){if(n<1024)return n+" B";if(n<1048576)return Math.round(n/1024)+" KB";return (n/1048576).toFixed(1)+" MB"}function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}


// ===== KHO TÀI LIỆU THẬT =====
let libraryDocuments=[];

function renderLibrary(){
  const q=$("librarySearch")?.value.trim().toLowerCase()||"";
  const subject=$("librarySubject")?.value||"";
  const folder=$("libraryFolder")?.value||"";
  const sort=$("librarySort")?.value||"newest";

  let list=libraryDocuments.filter(d=>{
    const hay=`${d.title} ${d.originalName} ${d.description||""} ${(d.tags||[]).join(" ")}`.toLowerCase();
    return (!q||hay.includes(q))&&(!subject||d.subject===subject)&&(!folder||d.folder===folder);
  });

  if(sort==="name") list.sort((a,b)=>a.originalName.localeCompare(b.originalName,"vi"));
  if(sort==="size") list.sort((a,b)=>(b.fileSize||0)-(a.fileSize||0));

  const box=$("libraryList");
  $("libraryEmpty").classList.toggle("hidden", libraryDocuments.length!==0);

  if(!list.length){
    box.innerHTML=`<div class="empty-state"><div>🔎</div><h3>Không tìm thấy tài liệu</h3><p>Thử đổi từ khóa hoặc bộ lọc.</p></div>`;
    return;
  }

  box.innerHTML=list.map(d=>`
    <article class="library-card">
      <div class="library-icon">${fileIcon(d.mimeType)}</div>
      <div class="library-content">
        <div class="library-card-head">
          <div><span class="subject-badge">${esc(d.subject)}</span><span class="folder-badge">📁 ${esc(d.folder||"Chưa phân loại")}</span></div>
          <button class="icon-small" data-lib-edit="${esc(d._id)}">✏️</button>
        </div>
        <h3>${esc(d.title)}</h3>
        <p class="file-name">📄 ${esc(d.originalName)}</p>
        <p class="muted">${esc(d.description||"Không có mô tả.")}</p>
        <div class="tag-row">${(d.tags||[]).map(t=>`<span class="tag">#${esc(t)}</span>`).join("")}</div>
        <div class="library-meta">${formatSize(d.fileSize)} • ${new Date(d.createdAt).toLocaleDateString("vi-VN")}</div>
        <div class="card-actions">
          <button class="primary" data-lib-ai="${esc(d._id)}">🤖 Học với AI</button>
          <button data-lib-preview="${esc(d._id)}">👁️ Xem</button>
          <button data-lib-open="${esc(d._id)}">⬇️ Mở / tải</button>
          <button class="danger-btn" data-lib-delete="${esc(d._id)}">🗑️ Xóa</button>
        </div>
      </div>
    </article>
  `).join("");
}

function fileIcon(mime){
  if(mime==="application/pdf") return "📕";
  if(mime==="image/jpeg"||mime==="image/png") return "🖼️";
  if(mime.includes("presentation")) return "📊";
  if(mime.includes("word")) return "📘";
  return "📄";
}

async function loadLibraryMeta(){
  try{
    const d=await api("/assignments/library/meta");
    const subject=$("librarySubject"), folder=$("libraryFolder");
    const currentSubject=subject.value, currentFolder=folder.value;
    subject.innerHTML='<option value="">Tất cả môn học</option>'+d.subjects.map(x=>`<option>${esc(x)}</option>`).join("");
    folder.innerHTML='<option value="">Tất cả thư mục</option>'+d.folders.map(x=>`<option>${esc(x)}</option>`).join("");
    subject.value=d.subjects.includes(currentSubject)?currentSubject:"";
    folder.value=d.folders.includes(currentFolder)?currentFolder:"";
  }catch(_){}
}

async function loadLibraryStats(){
  if(!$("libraryCount")) return;
  try{
    const d=await api("/assignments/stats");
    $("libraryCount").textContent=d.count||0;
    $("librarySize").textContent=formatSize(d.totalSize||0);
    $("libraryFolders").textContent=d.folders||0;
    $("statMaterials").textContent=d.count||0;
  }catch(_){}
}

async function loadLibrary(){
  if(!$("libraryList")) return;
  $("libraryList").innerHTML='<div class="panel"><p class="muted">⏳ Đang tải kho tài liệu...</p></div>';
  try{
    const params=new URLSearchParams({
      q:$("librarySearch").value.trim(),
      subject:$("librarySubject").value,
      folder:$("libraryFolder").value,
      sort:$("librarySort").value
    });
    const d=await api("/assignments/library?"+params.toString());
    libraryDocuments=d.documents||[];
    renderLibrary();
    await loadLibraryMeta();
    await loadLibraryStats();
  }catch(e){
    $("libraryList").innerHTML=`<div class="empty-state"><div>⚠️</div><p>${esc(e.message)}</p></div>`;
  }
}

let librarySearchTimer;
["librarySearch","librarySubject","libraryFolder","librarySort"].forEach(id=>{
  $(id)?.addEventListener("input",()=>{
    clearTimeout(librarySearchTimer);
    librarySearchTimer=setTimeout(loadLibrary, id==="librarySearch"?250:0);
  });
  $(id)?.addEventListener("change",loadLibrary);
});

$("refreshLibrary")?.addEventListener("click",loadLibrary);
$("libraryUploadForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  const file=$("libraryFile").files[0];
  if(!file) return msg("libraryUploadMessage","Vui lòng chọn file.");
  if(file.size>10*1024*1024) return msg("libraryUploadMessage","File vượt quá 10 MB.");
  if(!/\.(pdf|docx|pptx|jpg|jpeg|png)$/i.test(file.name)) return msg("libraryUploadMessage","Chỉ nhận PDF, DOCX, PPTX, JPG hoặc PNG.");

  const fd=new FormData();
  fd.append("title",$("libraryTitle").value.trim());
  fd.append("subject",$("librarySubjectInput").value);
  fd.append("folder",$("libraryFolderInput").value.trim()||"Chưa phân loại");
  fd.append("tags",$("libraryTagsInput").value.trim());
  fd.append("description",$("libraryDescriptionInput").value.trim());
  fd.append("file",file);

  const xhr=new XMLHttpRequest();
  xhr.open("POST",API+"/assignments");
  xhr.setRequestHeader("Authorization",`Bearer ${localStorage.getItem("token")}`);
  msg("libraryUploadMessage","Đang upload...",true);
  $("libraryUploadForm").querySelector("button").disabled=true;

  xhr.onload=()=>{
    $("libraryUploadForm").querySelector("button").disabled=false;
    let d={};try{d=JSON.parse(xhr.responseText)}catch(_){}
    if(xhr.status<200||xhr.status>=300)return msg("libraryUploadMessage",d.message||"Upload thất bại.");
    $("libraryUploadForm").reset();
    msg("libraryUploadMessage","✅ Đã thêm tài liệu vào kho.",true);
    toast("Đã thêm tài liệu");
    loadLibrary();
    updateStats();
  };
  xhr.onerror=()=>{
    $("libraryUploadForm").querySelector("button").disabled=false;
    msg("libraryUploadMessage","Không thể kết nối máy chủ.");
  };
  xhr.send(fd);
});

async function editLibrary(id){
  const d=libraryDocuments.find(x=>x._id===id);
  if(!d)return;
  const title=prompt("Tiêu đề tài liệu:",d.title);
  if(title===null)return;
  const folder=prompt("Thư mục:",d.folder||"Chưa phân loại");
  if(folder===null)return;
  const tags=prompt("Tag (cách nhau bằng dấu phẩy):",(d.tags||[]).join(", "));
  if(tags===null)return;
  try{
    await api("/assignments/"+encodeURIComponent(id),{
      method:"PATCH",
      body:JSON.stringify({title,folder,tags})
    });
    toast("Đã cập nhật tài liệu");
    loadLibrary();
  }catch(e){toast(e.message)}
}

async function deleteLibrary(id){
  const d=libraryDocuments.find(x=>x._id===id);
  if(!d||!confirm(`Xóa "${d.title}" khỏi kho tài liệu?`))return;
  try{
    await api("/assignments/"+encodeURIComponent(id),{method:"DELETE"});
    toast("Đã xóa tài liệu");
    loadLibrary();
    updateStats();
  }catch(e){toast(e.message)}
}

async function getLibraryBlob(id){\n  requireApi();
  const token=localStorage.getItem("token");
  const r=await fetch(`${API}/assignments/${encodeURIComponent(id)}/file`,{headers:{Authorization:`Bearer ${token}`}});
  if(!r.ok){let d={};try{d=await r.json()}catch(_){}throw new Error(d.message||`Không thể mở file (${r.status})`);}
  return r.blob();
}

async function openLibraryFile(id, preview=true){
  const d=libraryDocuments.find(x=>x._id===id);
  if(!d)return;
  try{
    const blob=await getLibraryBlob(id);
    const url=URL.createObjectURL(blob);
    const isPreviewable=d.mimeType==="application/pdf"||d.mimeType.startsWith("image/");
    if(preview && isPreviewable){
      const win=window.open("","_blank");
      if(!win){URL.revokeObjectURL(url);return toast("Trình duyệt đã chặn cửa sổ xem trước.");}
      win.document.write(d.mimeType.startsWith("image/")
        ? `<title>${esc(d.title)}</title><style>body{margin:0;background:#111;display:grid;place-items:center;height:100vh}img{max-width:95vw;max-height:95vh}</style><img src="${url}" alt="${esc(d.title)}">`
        : `<title>${esc(d.title)}</title><iframe src="${url}" style="border:0;width:100vw;height:100vh"></iframe>`);
      win.document.close();
    }else{
      const a=document.createElement("a");a.href=url;a.download=d.originalName||d.title;a.target="_blank";document.body.appendChild(a);a.click();a.remove();
    }
  }catch(e){toast(e.message)}
}

function previewLibrary(id){openLibraryFile(id,true)}

let aiDocumentId=null;

async function openAiDocument(id){
  const d=libraryDocuments.find(x=>x._id===id);
  if(!d)return;
  aiDocumentId=id;
  $("aiDocumentPanel").classList.remove("hidden");
  $("aiDocumentTitle").textContent=d.title;
  $("aiDocumentFile").textContent=d.originalName;
  $("aiDocumentResult").innerHTML='<p class="muted">Chọn một tác vụ AI để bắt đầu.</p>';
  $("aiDocumentStatus").textContent='';
  $("aiAskInput").value='';
  $("aiDocumentPanel").scrollIntoView({behavior:"smooth",block:"start"});
}

async function runDocumentAI(action,prompt=''){
  if(!aiDocumentId)return;
  const result=$("aiDocumentResult"), status=$("aiDocumentStatus");
  result.innerHTML='<div class="ai-loading">🤖 AI đang đọc tài liệu và xử lý...</div>';
  status.textContent='';
  document.querySelectorAll('[data-ai-action],#aiAskForm button').forEach(b=>b.disabled=true);
  try{
    const d=await api(`/ai/document/${encodeURIComponent(aiDocumentId)}`,{method:"POST",body:JSON.stringify({action,prompt})});
    result.innerHTML=`<div class="ai-result-text">${formatAI(d.reply)}</div>`;
  }catch(e){
    result.innerHTML=`<div class="empty-state"><div>⚠️</div><p>${esc(e.message)}</p></div>`;
    status.textContent=e.message.includes('OPENAI_API_KEY')?'Hãy thêm OPENAI_API_KEY vào file .env rồi khởi động lại backend.':'';
  }finally{
    document.querySelectorAll('[data-ai-action],#aiAskForm button').forEach(b=>b.disabled=false);
  }
}

function formatAI(text){
  return esc(text).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/^###\s?(.*)$/gm,'<h4>$1</h4>').replace(/^##\s?(.*)$/gm,'<h3>$1</h3>').replace(/\n/g,'<br>');
}

document.addEventListener("click",e=>{
  const p=e.target.closest("[data-lib-preview]"); if(p)previewLibrary(p.dataset.libPreview);
  const d=e.target.closest("[data-lib-delete]"); if(d)deleteLibrary(d.dataset.libDelete);
  const ed=e.target.closest("[data-lib-edit]"); if(ed)editLibrary(ed.dataset.libEdit);
  const open=e.target.closest("[data-lib-open]"); if(open)openLibraryFile(open.dataset.libOpen,false);
  const ai=e.target.closest("[data-lib-ai]"); if(ai)openAiDocument(ai.dataset.libAi);
  const action=e.target.closest("[data-ai-action]"); if(action)runDocumentAI(action.dataset.aiAction);
});

$("closeAiDocument")?.addEventListener("click",()=>{aiDocumentId=null;$("aiDocumentPanel").classList.add("hidden")});
$("aiAskForm")?.addEventListener("submit",e=>{e.preventDefault();const q=$("aiAskInput").value.trim();if(q)runDocumentAI("ask",q)});

$("saveGoal").onclick=()=>{localStorage.setItem(key("goal"),$("dailyGoal").value);toast("Đã lưu mục tiêu")}
$("startTimer").onclick=()=>{if(timer)return;timer=setInterval(()=>{seconds--;updateTimer();if(seconds<=0){clearInterval(timer);timer=null;toast("Pomodoro đã kết thúc 🎉");seconds=1500;updateTimer()}},1000)}
$("resetTimer").onclick=()=>{clearInterval(timer);timer=null;seconds=1500;updateTimer()}
function updateTimer(){$("timer").textContent=`${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`}

$("themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("alh_theme",document.body.classList.contains("dark")?"dark":"light")}
$("clearLocal").onclick=()=>{if(!confirm("Xóa bài tập và mục tiêu lưu trên thiết bị này? Tài liệu trong Kho tài liệu sẽ không bị xóa."))return;["tasks","goal"].forEach(k=>localStorage.removeItem(key(k)));loadLocal();updateStats();toast("Đã xóa dữ liệu học tập")}
if(localStorage.getItem("alh_theme")==="dark")document.body.classList.add("dark");

(async function init(){const s=localStorage.getItem("user"),t=localStorage.getItem("token");if(!s||!t)return;try{currentUser=JSON.parse(s);const d=await api("/auth/me");currentUser=d.user;localStorage.setItem("user",JSON.stringify(currentUser));showApp()}catch{localStorage.removeItem("token");localStorage.removeItem("user")}})();

