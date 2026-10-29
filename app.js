(() => {
  const config = window.VX_CONFIG || {};
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const state = {talents:[],page:"home",filter:"all",subgroup:"all",query:"",favorites:getFavorites(),source:"local"};
  const grid=$("#talentGrid");
  const branchNames={id:"hololive Indonesia",jp:"hololive Japan",en:"hololive English",asobi:"ASOBI★MAWARI-TAI!"};
  const branchCodes={id:"ID",jp:"JP",en:"EN",asobi:"ASOBI"};
  const branchColors={id:["#ffe8e8","#d22b38"],jp:["#e5edff","#174fce"],en:["#eee7ff","#7044c8"],asobi:["#fff4d8","#b7830b"],default:["#e8f0ff","#1769ff"]};
  const escapeHTML=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function getFavorites(){try{return new Set(JSON.parse(localStorage.getItem("vx-favorites")||"[]"))}catch{return new Set()}}
  function saveFavorites(){localStorage.setItem("vx-favorites",JSON.stringify([...state.favorites]));updateStats()}
  function keyOf(t){return String(t.id||t.slug||t.name||"talent").toLowerCase().replace(/\s+/g,"-")}
  function normalizeBranch(t){
    const raw=String(t.branch||t.branch_name||t.region||t.language||t.group||t.group_name||"").toLowerCase();
    if(raw.includes("asobi")||raw.includes("mawari"))return "asobi";
    if(raw==="id"||raw.includes("indonesia")||raw.includes("area15")||raw.includes("area 15")||raw.includes("holoro")||raw.includes("holoh3ro")||raw.includes("holoh3ro"))return "id";
    if(raw==="en"||raw.includes("english")||raw.includes("myth")||raw.includes("promise")||raw.includes("advent")||raw.includes("justice")||raw.includes("flow glow"))return "en";
    if(raw==="jp"||raw.includes("japan")||raw.includes("hololive jp")||raw.includes("gamers")||raw.includes("holox")||raw.includes("holo-x")||raw.includes("regloss"))return "jp";
    const n=String(t.name||t.english_name||t.englishName||"").toLowerCase();
    if(/kobo|moona|risu|ollie|kaela|zeta|iofi|reine|anya|holoro|area15|holoh3ro/.test(n))return "id";
    if(/calliope|kiara|ina.?nis|gura|amelia|irys|kronii|baelz|shiori|bijou|nerissa|fuwawa|mococo|elizabeth|gigi|cecilia|raora/.test(n))return "en";
    return "jp";
  }
  function normalize(raw){
    let arr=[];
    if(Array.isArray(raw))arr=raw;
    else if(raw&&Array.isArray(raw.talents))arr=raw.talents;
    else if(raw&&Array.isArray(raw.data))arr=raw.data;
    else if(raw&&Array.isArray(raw.members))arr=raw.members;
    else if(raw&&typeof raw==="object"){
      // Support object maps keyed by talent slug/name as well as API-style JSON.
      arr=Object.entries(raw).filter(([k,v])=>v&&typeof v==="object"&&!Array.isArray(v)).map(([k,v])=>({id:k,...v}));
    }
    return arr.map((t,i)=>{
      const item={...t};
      item.id=String(t.id||t.slug||t.english_name||t.englishName||t.name||`talent-${i}`);
      item.name=t.name||t.english_name||t.englishName||t.display_name||"Unknown Talent";
      item.nativeName=t.nativeName||t.native_name||t.japanese_name||t.jp_name||t.name_jp||"";
      item.branch=normalizeBranch(t);
      item.generation=t.generation||t.gen||t.group_name||t.unit||t.debut_generation||"Hololive";
      item.category=t.category||t.subgroup||t.unit||t.generation||t.gen||t.group_name||"";
      item.image=t.image||t.image_url||t.photo_url||t.photo||t.avatar_url||t.avatar||t.thumbnail||t.img||t.portrait||"";
      item.bio=t.bio||t.description||t.profile||t.about||"";
      item.debut=t.debut||t.debut_date||"";
      item.youtube=t.youtube||t.youtube_url||t.channel||t.channel_url||"";
      item.twitter=t.twitter||t.x||t.twitter_url||"";
      item.official=t.official||t.official_url||t.url||"";
      item.status=t.status||t.activity||((t.alum||t.graduated)?"alumni":"active");
      return item;
    });
  }
  async function fetchWithTimeout(url,ms=9000){
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),ms);
    try{
      const res=await fetch(url,{cache:"no-store",signal:controller.signal,headers:{"Accept":"application/json"}});
      if(!res.ok)throw new Error(`HTTP ${res.status} saat membuka ${url}`);
      return await res.json();
    }finally{clearTimeout(timer)}
  }
  async function loadData(){
    setStatus("Menghubungkan ke database...");
    grid.innerHTML='<div class="loading-state"><div class="loader"></div><span>Menghubungkan ke database talent...</span></div>';
    let githubError="";
    const githubURL=String(config.GITHUB_JSON_URL||"").trim();
    if(githubURL){
      try{
        const data=normalize(await fetchWithTimeout(githubURL));
        if(!data.length)throw new Error("JSON berhasil dibuka tetapi tidak berisi daftar talent yang dikenali.");
        state.talents=data;state.source="github";
      }catch(err){githubError=err.message||"Gagal mengambil JSON GitHub";console.warn("GitHub JSON gagal:",err)}
    }
    if(!state.talents.length){
      try{
        const data=normalize(await fetchWithTimeout((config.LOCAL_JSON_URL||"data/talents.json")+"?v="+Date.now()));
        if(!data.length)throw new Error("JSON lokal tidak berisi talent.");
        state.talents=data;state.source="local";
      }catch(err){
        console.error("JSON lokal gagal:",err);
        setStatus("Data gagal dimuat");
        $("#sourceNote").textContent="Gagal memuat JSON. Pastikan URL RAW benar, file publik, JSON valid, dan buka website melalui hosting (bukan file://).";
        grid.innerHTML=`<div class="load-error"><strong>Data talent belum bisa dimuat.</strong><p>${escapeHTML(err.message||"Periksa URL JSON.")}</p><p>Periksa config.js dan pastikan URL GitHub berakhiran nama file JSON, bukan halaman repository.</p><button class="button button-primary" id="retryError">Coba lagi ↻</button></div>`;
        updateStats();return;
      }
    }
    setStatus(state.source==="github"?"Data tersambung dari GitHub JSON":"Data contoh lokal aktif");
    $("#sourceNote").textContent=state.source==="github"?"Sumber data: GitHub RAW JSON berhasil dimuat.":"GitHub belum berhasil dimuat; sedang memakai data contoh lokal."+(githubError?" Detail: "+githubError:"");
    render();
  }
  function setStatus(s){$("#dataStatus").textContent=s}
  function updateStats(){$("#talentTotal").textContent=String(state.talents.length).padStart(2,"0");$("#favoriteTotal").textContent=String(state.favorites.size).padStart(2,"0");$("#favoriteCount").textContent=String(state.favorites.size)}
  function pageBranch(){return ["id","jp","en","asobi"].includes(state.page)?state.page:null}
  function pageTitle(){
    if(state.page==="id")return ["hololive Indonesia","Pilih unit atau generasi dari branch Indonesia."];
    if(state.page==="jp")return ["hololive Japan","Pilih generasi atau unit dari branch Jepang."];
    if(state.page==="en")return ["hololive English","Pilih generasi dari branch English."];
    if(state.page==="asobi")return ["ASOBI★MAWARI-TAI!","Kenali unit ASOBI★MAWARI-TAI!."];
    if(state.page==="favorites")return ["Talent favorit","Daftar talent yang kamu simpan di perangkat ini."];
    if(state.page==="alumni")return ["Talent yang sudah lulus","Kenang dan jelajahi profil talent alumni hololive."];
    return ["Explore talents","Cari talent berdasarkan nama, branch, atau generasi."];
  }
  function isAlum(t){const s=String(t.status||t.activity||"").toLowerCase();return t.alum===true||t.graduated===true||s.includes("alum")||s.includes("graduat")||s.includes("retir")}
  function groupName(t){
    const s=String(t.category||t.generation||t.gen||t.unit||t.group_name||"").trim();
    const low=s.toLowerCase();
    if(t.branch==="id"){
      if(/area\s*15|area15/.test(low))return "AREA15";
      if(/holoro/.test(low))return "holoro";
      if(/holoh3ro|holo?h3ro/.test(low))return "holoh3ro";
      if(/gen(?:eration)?\s*1|gen\s*i\b/.test(low))return "Gen 1";
      if(/gen(?:eration)?\s*2|gen\s*ii\b/.test(low))return "Gen 2";
      if(/gen(?:eration)?\s*3|gen\s*iii\b/.test(low))return "Gen 3";
    }
    return s||"Lainnya";
  }
  function getSubgroups(){
    const branch=pageBranch();
    if(!branch||branch==="asobi")return [];
    const groups=[...new Set(state.talents.filter(t=>t.branch===branch).map(groupName).filter(Boolean))];
    const preferred=branch==="id"?["AREA15","holoro","holoh3ro","Gen 1","Gen 2","Gen 3"]:branch==="jp"?["Gen 0","Gen 1","Gen 2","Gamers","Gen 3","Gen 4","Gen 5","holoX","ReGLOSS","FLOW GLOW"]:["Myth","Promise","Advent","Justice"];
    groups.sort((a,b)=>{let ai=preferred.findIndex(x=>x.toLowerCase()===a.toLowerCase()),bi=preferred.findIndex(x=>x.toLowerCase()===b.toLowerCase());if(ai<0)ai=99;if(bi<0)bi=99;return ai-bi||a.localeCompare(b)});
    return groups;
  }
  function filteredTalents(){
    let list=[...state.talents],branch=pageBranch();
    if(branch)list=list.filter(t=>t.branch===branch);
    if(state.page==="favorites")list=list.filter(t=>state.favorites.has(keyOf(t)));
    if(state.page==="alumni")list=list.filter(isAlum);
    if(state.filter==="active")list=list.filter(t=>!isAlum(t));
    if(state.filter==="alum")list=list.filter(isAlum);
    if(state.subgroup!=="all")list=list.filter(t=>groupName(t).toLowerCase()===state.subgroup.toLowerCase());
    const q=state.query.trim().toLowerCase();
    if(q)list=list.filter(t=>[t.name,t.nativeName,t.generation,t.category,t.bio,t.branch].join(" ").toLowerCase().includes(q));
    return list;
  }
  function renderCard(t){
    const key=keyOf(t),branch=t.branch||"jp",colors=branchColors[branch]||branchColors.default;
    const initials=String(t.name).split(/\s+/).slice(0,2).map(s=>s[0]).join("").toUpperCase();
    const image=t.image?`<img src="${escapeHTML(t.image)}" alt="${escapeHTML(t.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><span class="avatar-fallback" style="display:none">${escapeHTML(initials)}</span>`:`<span class="avatar-fallback">${escapeHTML(initials)}</span>`;
    return `<article class="talent-card" tabindex="0" role="button" data-profile="${escapeHTML(key)}" aria-label="Lihat profil ${escapeHTML(t.name)}"><div class="card-cover" style="background:linear-gradient(130deg,${colors[0]},#f8faff)"><span class="branch-tag">${escapeHTML(branchCodes[branch]||"TALENT")}</span><button class="favorite-button ${state.favorites.has(key)?"saved":""}" data-favorite="${escapeHTML(key)}" aria-label="Favorit">${state.favorites.has(key)?"♥":"♡"}</button><div class="card-avatar">${image}</div></div><div class="card-info"><h3 class="card-name">${escapeHTML(t.name)}</h3><div class="card-native">${escapeHTML(t.nativeName||branchNames[branch]||"hololive production")}</div><div class="card-meta"><span class="generation">${escapeHTML(groupName(t))}</span><span class="profile-link">Lihat profil ↗</span></div></div></article>`;
  }
  function renderSubgroups(){
    const el=$("#subgroupPills"),branch=pageBranch(),groups=getSubgroups();
    el.innerHTML="";
    el.classList.toggle("hidden",!branch||branch==="asobi"||!groups.length);
    if(el.classList.contains("hidden"))return;
    const all=document.createElement("button");all.className="filter-pill"+(state.subgroup==="all"?" selected":"");all.textContent="Semua";all.dataset.subgroup="all";el.appendChild(all);
    groups.forEach(g=>{const b=document.createElement("button");b.className="filter-pill"+(state.subgroup.toLowerCase()===g.toLowerCase()?" selected":"");b.textContent=g;b.dataset.subgroup=g;el.appendChild(b)});
  }
  function render(){
    const [title,subtitle]=pageTitle();
    $("#directoryTitle").innerHTML=`${escapeHTML(title)}<span>.</span>`;$("#directorySubtitle").textContent=subtitle;
    const list=filteredTalents();$("#resultCount").textContent=`${list.length} talent`;
    grid.innerHTML=list.length?list.map(renderCard).join(""):"";
    $("#emptyState").classList.toggle("hidden",list.length>0);grid.classList.toggle("hidden",!list.length);
    $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===state.page));
    $("#filterPills").classList.toggle("hidden",state.page==="about");
    $$(".filter-pill[data-filter]").forEach(b=>b.classList.toggle("selected",b.dataset.filter===state.filter));
    renderSubgroups();updateStats();
  }
  function closeMenu(){$("#sidebar").classList.remove("open");$("#scrim").classList.remove("show");$("#menuToggle").setAttribute("aria-expanded","false")}
  function go(page){
    state.page=page;state.filter="all";state.subgroup="all";state.query="";$("#searchInput").value="";$("#clearSearch").style.display="none";closeMenu();
    history.replaceState(null,"","#"+page);render();$("#app").focus({preventScroll:true});
    if(page==="home")window.scrollTo({top:0,behavior:"smooth"});else $("#directory").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function findTalent(key){return state.talents.find(t=>keyOf(t)===key||String(t.id).toLowerCase()===key.toLowerCase())}
  function openProfile(key){
    const t=findTalent(key);if(!t)return;
    const branch=t.branch||"jp",colors=branchColors[branch]||branchColors.default,initials=String(t.name).split(/\s+/).slice(0,2).map(s=>s[0]).join("").toUpperCase();
    const image=t.image?`<img src="${escapeHTML(t.image)}" alt="${escapeHTML(t.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><span style="display:none">${escapeHTML(initials)}</span>`:escapeHTML(initials);
    const links=[],youtube=t.youtube||(t.channel_id?`https://www.youtube.com/channel/${t.channel_id}`:"");
    if(youtube)links.push(`<a href="${escapeHTML(youtube)}" target="_blank" rel="noreferrer">YouTube ↗</a>`);
    if(t.twitter)links.push(`<a href="${escapeHTML(String(t.twitter).startsWith("http")?t.twitter:"https://x.com/"+String(t.twitter).replace(/^@/,""))}" target="_blank" rel="noreferrer">X / Twitter ↗</a>`);
    if(t.official)links.push(`<a href="${escapeHTML(t.official)}" target="_blank" rel="noreferrer">Situs resmi ↗</a>`);
    const saved=state.favorites.has(keyOf(t));
    $("#profileContent").innerHTML=`<div class="profile-banner" style="background:linear-gradient(125deg,${colors[0]},#f4f7ff)"><div class="profile-avatar">${image}</div></div><div class="profile-body"><div class="profile-branch">${escapeHTML(branchNames[branch]||"HOLOLIVE TALENT")}</div><h2 id="profileName">${escapeHTML(t.name)}</h2><div class="profile-native">${escapeHTML(t.nativeName||"")}</div><p class="profile-bio">${escapeHTML(t.bio||"Belum ada deskripsi. Tambahkan field bio pada JSON GitHub untuk melengkapi profil.")}</p><div class="profile-details"><div class="detail-box"><small>BRANCH / UNIT</small><strong>${escapeHTML(t.generation||branchNames[branch]||"Hololive")}</strong></div><div class="detail-box"><small>GENERASI / SUBGROUP</small><strong>${escapeHTML(groupName(t)||"—")}</strong></div><div class="detail-box"><small>DEBUT STREAM</small><strong>${escapeHTML(t.debut||"Cek situs resmi")}</strong></div><div class="detail-box"><small>STATUS</small><strong>${isAlum(t)?"Alumni":(t.status==="affiliate"?"Affiliate":"Aktif / talent")}</strong></div>${t.birthday?`<div class="detail-box"><small>ULANG TAHUN</small><strong>${escapeHTML(t.birthday)}</strong></div>`:""}${t.height?`<div class="detail-box"><small>TINGGI</small><strong>${escapeHTML(t.height)}</strong></div>`:""}${t.illustrator?`<div class="detail-box"><small>ILUSTRATOR RESMI</small><strong>${escapeHTML(t.illustrator)}</strong></div>`:""}${t.fanName?`<div class="detail-box"><small>NAMA FANDOM</small><strong>${escapeHTML(t.fanName)}</strong></div>`:""}${t.fanMark?`<div class="detail-box"><small>FAN MARK</small><strong>${escapeHTML(t.fanMark)}</strong></div>`:""}${t.streamTag?`<div class="detail-box"><small>STREAM TAG</small><strong>${escapeHTML(t.streamTag)}</strong></div>`:""}${t.artTag?`<div class="detail-box"><small>ART TAG</small><strong>${escapeHTML(t.artTag)}</strong></div>`:""}</div><div class="profile-links">${links.join("")}<button data-favorite="${escapeHTML(keyOf(t))}">${saved?"♥ Tersimpan":"♡ Simpan favorit"}</button><a href="https://hololive.hololivepro.com/en/talents/" target="_blank" rel="noreferrer">Cek official page ↗</a></div></div>`;
    $("#profileBackdrop").classList.remove("hidden");document.body.style.overflow="hidden";
  }
  function closeProfile(){$("#profileBackdrop").classList.add("hidden");document.body.style.overflow=""}
  function toggleFavorite(key){const t=findTalent(key);if(!t)return;const k=keyOf(t);state.favorites.has(k)?state.favorites.delete(k):state.favorites.add(k);saveFavorites();render();if(!$("#profileBackdrop").classList.contains("hidden"))openProfile(k)}
  document.addEventListener("click",e=>{
    const nav=e.target.closest("[data-page]");if(nav){go(nav.dataset.page);return}
    const goBtn=e.target.closest("[data-go]");if(goBtn){go(goBtn.dataset.go);return}
    const fav=e.target.closest("[data-favorite]");if(fav){e.stopPropagation();toggleFavorite(fav.dataset.favorite);return}
    const card=e.target.closest("[data-profile]");if(card){openProfile(card.dataset.profile);return}
    const filter=e.target.closest("[data-filter]");if(filter){state.filter=filter.dataset.filter;render();return}
    const subgroup=e.target.closest("[data-subgroup]");if(subgroup){state.subgroup=subgroup.dataset.subgroup;render();return}
    if(e.target.closest("#retryError"))loadData();
  });
  grid.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches("[data-profile]")){e.preventDefault();openProfile(e.target.dataset.profile)}});
  $("#menuToggle").addEventListener("click",()=>$("#sidebar").classList.contains("open")?closeMenu():($("#sidebar").classList.add("open"),$("#scrim").classList.add("show"),$("#menuToggle").setAttribute("aria-expanded","true")));
  $("#scrim").addEventListener("click",closeMenu);
  $("#searchInput").addEventListener("input",e=>{state.query=e.target.value;$("#clearSearch").style.display=state.query?"block":"none";render()});
  $("#clearSearch").addEventListener("click",()=>{$("#searchInput").value="";state.query="";$("#clearSearch").style.display="none";render();$("#searchInput").focus()});
  $("#focusSearch").addEventListener("click",()=>{$("#directory").scrollIntoView({behavior:"smooth"});setTimeout(()=>$("#searchInput").focus(),250)});
  document.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#directory").scrollIntoView({behavior:"smooth"});$("#searchInput").focus()}if(e.key==="Escape"){closeProfile();closeMenu()}});
  $("#closeProfile").addEventListener("click",closeProfile);
  $("#profileBackdrop").addEventListener("click",e=>{if(e.target===$("#profileBackdrop"))closeProfile()});
  $("#exploreBtn").addEventListener("click",()=>$("#directory").scrollIntoView({behavior:"smooth"}));
  $("#resetFilters").addEventListener("click",()=>{state.filter="all";state.subgroup="all";state.query="";$("#searchInput").value="";render()});
  $("#retryData").addEventListener("click",loadData);
  window.addEventListener("hashchange",()=>{const p=location.hash.slice(1);if(["home","id","jp","en","asobi","favorites","alumni","about"].includes(p)&&p!==state.page)go(p)});
  // About page uses the same content area and remains client-side.
  const baseRender=render;
  render=function(){
    if(state.page==="about"){
      $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page==="about"));
      grid.classList.add("hidden");$("#emptyState").classList.add("hidden");$("#directoryTitle").innerHTML="Tentang proyek<span>.</span>";$("#directorySubtitle").textContent="Cara menghubungkan JSON GitHub dan menambahkan gambar talent.";$("#filterPills").classList.add("hidden");$("#subgroupPills").classList.add("hidden");$("#resultCount").textContent="PROJECT INFO";
      let about=$("#aboutContent");if(!about){about=document.createElement("section");about.id="aboutContent";about.className="about-page";$("#directory").appendChild(about)}
      about.innerHTML=`<div class="eyebrow"><span class="eyebrow-line"></span> ABOUT THIS SPACE</div><h1>More than a list.<br><span>A place to discover.</span></h1><p class="lead">VTUBE XSPACE adalah fan project untuk membantu penggemar menjelajahi talent hololive dalam satu ruang.</p><div class="about-card"><h3>01 / GitHub JSON</h3><p>Buka <code>config.js</code> dan isi <code>GITHUB_JSON_URL</code> dengan URL RAW file JSON yang publik. Contoh: <code>https://raw.githubusercontent.com/USERNAME/REPO/main/data/talents.json</code></p><p>Gunakan alamat dari tombol <b>Raw</b>, bukan alamat halaman GitHub biasa. Jika gagal, website akan menampilkan pesan error dan mencoba data lokal.</p></div><div class="about-card"><h3>02 / Gambar talent via URL</h3><p>Tambahkan field <code>"image": "https://alamat-gambar/talent.png"</code> pada setiap objek talent. Gambar harus bisa diakses publik langsung, bukan URL halaman preview/Google Drive yang meminta login.</p></div><div class="about-card"><h3>03 / Subgroup</h3><p>Isi field <code>generation</code>, <code>gen</code>, <code>unit</code>, atau <code>group_name</code>. Contoh Indonesia: <code>AREA15</code>, <code>holoro</code>, <code>holoh3ro</code>. Untuk EN: <code>Myth</code>, <code>Promise</code>, <code>Advent</code>, <code>Justice</code>. Untuk JP, isi generasi/unit talent.</p></div><div class="about-card"><h3>04 / Format JSON</h3><p><code>{"name":"Nama Talent","branch":"ID","generation":"holoro","image":"https://...png","bio":"Deskripsi"}</code></p></div><div class="about-card"><h3>05 / Catatan</h3><p>Fan-made, tidak berafiliasi dengan COVER Corp. Periksa izin penggunaan gambar dan sumber data.</p><p><a href="https://hololive.hololivepro.com/en/talents/" target="_blank" rel="noreferrer">Website resmi Hololive ↗</a></p></div>`;
      updateStats();return;
    }
    const about=$("#aboutContent");if(about)about.remove();baseRender();
  };
  const initial=location.hash.slice(1);state.page=["id","jp","en","asobi","favorites","alumni","about"].includes(initial)?initial:"home";
  loadData();
})();