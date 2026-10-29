(() => {
  const config = window.VX_CONFIG || {};
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const state = { talents: [], page: "home", filter: "all", query: "", favorites: getFavorites(), source: "local" };
  const grid = $("#talentGrid");
  const branchNames = { id:"hololive Indonesia", jp:"hololive Japan", en:"hololive English", asobi:"ASOBI★MAWARI-TAI!" };
  const branchCodes = { id:"ID", jp:"JP", en:"EN", asobi:"ASOBI" };
  const branchColors = { id:["#ffe8e8","#d22b38"], jp:["#e5edff","#174fce"], en:["#eee7ff","#7044c8"], asobi:["#fff4d8","#b7830b"], default:["#e8f0ff","#1769ff"] };
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function getFavorites(){ try { return new Set(JSON.parse(localStorage.getItem("vx-favorites") || "[]")); } catch { return new Set(); } }
  function saveFavorites(){ localStorage.setItem("vx-favorites", JSON.stringify([...state.favorites])); updateStats(); }
  function keyOf(t){ return String(t.id || t.slug || t.name || "talent").toLowerCase().replace(/\s+/g,"-"); }
  function branchOf(t){
    const raw = String(t.branch || t.group || t.language || t.region || "").toLowerCase();
    if (raw.includes("asobi") || raw.includes("mawari")) return "asobi";
    if (raw === "id" || raw.includes("indonesia") || raw.includes("holoro") || raw.includes("area15") || raw.includes("holoh3ro")) return "id";
    if (raw === "en" || raw.includes("english") || raw.includes("myth") || raw.includes("promise") || raw.includes("advent") || raw.includes("justice")) return "en";
    if (raw === "jp" || raw.includes("japan") || raw.includes("gen") || raw.includes("hololive")) return "jp";
    const name = String(t.name || "").toLowerCase();
    if (name.includes("kobo") || name.includes("moona") || name.includes("risu") || name.includes("ollie") || name.includes("kaela") || name.includes("zeta") || name.includes("iofifteen") || name.includes("reine") || name.includes("anya")) return "id";
    if (name.includes("calliope") || name.includes("kiara") || name.includes("ina") || name.includes("gura") || name.includes("amelia") || name.includes("irys") || name.includes("kronii") || name.includes("baelz") || name.includes("shiori") || name.includes("bijou") || name.includes("nerissa") || name.includes("fuwawa") || name.includes("mococo") || name.includes("elizabeth") || name.includes("gigi") || name.includes("cecilia") || name.includes("raora")) return "en";
    return "jp";
  }
  function isAlum(t){ const status=String(t.status || t.activity || "").toLowerCase(); return t.alum === true || t.graduated === true || status.includes("alum") || status.includes("graduat") || status.includes("retir"); }
  function normalize(raw){
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw.talents) ? raw.talents : Array.isArray(raw.data) ? raw.data : Object.values(raw).filter(v => v && typeof v==="object" && (v.name || v.english_name || v.englishName));
    return arr.map((t,i)=>({
      ...t,
      id: String(t.id || t.slug || t.english_name || t.englishName || t.name || `talent-${i}`),
      name: t.name || t.english_name || t.englishName || "Unknown Talent",
      nativeName: t.nativeName || t.native_name || t.japanese_name || t.jp_name || "",
      generation: t.generation || t.gen || t.group_name || t.unit || "Hololive",
      branch: branchOf(t),
      image: t.image || t.photo || t.avatar || t.thumbnail || t.img || "",
      bio: t.bio || t.description || t.profile || "",
      debut: t.debut || t.debut_date || "",
      youtube: t.youtube || t.youtube_url || t.channel || "",
      twitter: t.twitter || t.x || t.twitter_url || "",
      official: t.official || t.url || ""
    }));
  }
  async function fetchJSON(url){
    const response = await fetch(url, {cache:"no-store"});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
  async function loadData(){
    setStatus("Menghubungkan ke database...");
    const githubURL = String(config.GITHUB_JSON_URL || "").trim();
    if(githubURL){
      try { state.talents = normalize(await fetchJSON(githubURL)); state.source="github"; }
      catch(err){ console.warn("GitHub JSON gagal dimuat:",err); }
    }
    if(!state.talents.length){
      try { state.talents = normalize(await fetchJSON(config.LOCAL_JSON_URL || "data/talents.json")); state.source="local"; }
      catch(err){ console.error(err); state.talents=[]; }
    }
    if(state.talents.length){
      setStatus(state.source==="github" ? "Data tersambung dari GitHub JSON" : "Data contoh lokal aktif");
      $("#sourceNote").textContent = state.source==="github" ? "Sumber data: GitHub raw JSON. Ubah file JSON di repository untuk memperbarui daftar." : "Memakai data contoh lokal. Atur URL JSON GitHub di config.js untuk data repository milikmu.";
    } else {
      setStatus("Data gagal dimuat");
      $("#sourceNote").textContent="Periksa koneksi dan lokasi file JSON, lalu coba muat ulang.";
    }
    render();
  }
  function setStatus(msg){ $("#dataStatus").textContent=msg; }
  function updateStats(){
    $("#talentTotal").textContent=String(state.talents.length).padStart(2,"0");
    $("#favoriteTotal").textContent=String(state.favorites.size).padStart(2,"0");
    $("#favoriteCount").textContent=String(state.favorites.size);
  }
  function pageBranch(){ return ["id","jp","en","asobi"].includes(state.page) ? state.page : null; }
  function pageTitle(){
    if(state.page==="id") return ["hololive Indonesia","Kenali talent dari branch Indonesia."];
    if(state.page==="jp") return ["hololive Japan","Jelajahi talent dari branch Jepang."];
    if(state.page==="en") return ["hololive English","Discover talents from the English branch."];
    if(state.page==="asobi") return ["ASOBI★MAWARI-TAI!","Kenali unit ASOBI★MAWARI-TAI!."];
    if(state.page==="favorites") return ["Talent favorit","Daftar talent yang kamu simpan di perangkat ini."];
    return ["Explore talents","Cari talent berdasarkan nama, branch, atau generasi."];
  }
  function filteredTalents(){
    let list=[...state.talents];
    const branch=pageBranch();
    if(branch) list=list.filter(t=>t.branch===branch);
    if(state.page==="favorites") list=list.filter(t=>state.favorites.has(keyOf(t)));
    if(state.filter==="active") list=list.filter(t=>!isAlum(t));
    if(state.filter==="alum") list=list.filter(isAlum);
    const q=state.query.trim().toLowerCase();
    if(q) list=list.filter(t=>[t.name,t.nativeName,t.generation,t.bio,t.branch].join(" ").toLowerCase().includes(q));
    return list;
  }
  function renderCard(t){
    const key=keyOf(t), branch=t.branch || "jp", colors=branchColors[branch]||branchColors.default;
    const initials=String(t.name).split(/\s+/).slice(0,2).map(s=>s[0]).join("").toUpperCase();
    const image=t.image ? `<img src="${escapeHTML(t.image)}" alt="" loading="lazy" onerror="this.remove();this.parentElement.innerHTML='<span class=&quot;avatar-fallback&quot;>${escapeHTML(initials)}</span>'">` : `<span class="avatar-fallback">${escapeHTML(initials)}</span>`;
    return `<article class="talent-card" tabindex="0" role="button" data-profile="${escapeHTML(key)}" aria-label="Lihat profil ${escapeHTML(t.name)}">
      <div class="card-cover" style="background:linear-gradient(130deg,${colors[0]},#f8faff)">
        <span class="branch-tag">${escapeHTML(branchCodes[branch]||"TALENT")}</span>
        <button class="favorite-button ${state.favorites.has(key)?"saved":""}" data-favorite="${escapeHTML(key)}" aria-label="${state.favorites.has(key)?"Hapus dari":"Tambah ke"} favorit" title="Favorit">${state.favorites.has(key)?"♥":"♡"}</button>
        <div class="card-avatar">${image}</div>
      </div>
      <div class="card-info"><h3 class="card-name">${escapeHTML(t.name)}</h3><div class="card-native">${escapeHTML(t.nativeName || branchNames[branch] || "hololive production")}</div>
        <div class="card-meta"><span class="generation">${escapeHTML(t.generation || "Hololive")}</span><span class="profile-link">Lihat profil ↗</span></div>
      </div>
    </article>`;
  }
  function render(){
    const [title,subtitle]=pageTitle();
    $("#directoryTitle").innerHTML=`${escapeHTML(title)}<span>.</span>`;
    $("#directorySubtitle").textContent=subtitle;
    const list=filteredTalents();
    $("#resultCount").textContent=`${list.length} talent`;
    grid.innerHTML=list.length?list.map(renderCard).join(""):`<div class="loading-state">Belum ada data untuk ditampilkan.</div>`;
    $("#emptyState").classList.toggle("hidden",list.length>0);
    grid.classList.toggle("hidden",list.length===0);
    $("#filterPills").classList.toggle("hidden",state.page==="about");
    $$(".nav-item").forEach(btn=>btn.classList.toggle("active",btn.dataset.page===state.page));
    updateStats();
  }
  function go(page){
    state.page=page; state.filter="all"; state.query="";
    $("#searchInput").value="";
    closeMenu();
    if(page==="home"){ window.location.hash="home"; } else { window.location.hash=page; }
    render();
    $("#app").focus({preventScroll:true});
  }
  function openMenu(){ $("#sidebar").classList.add("open");$("#scrim").classList.add("show");$("#menuToggle").setAttribute("aria-expanded","true"); }
  function closeMenu(){ $("#sidebar").classList.remove("open");$("#scrim").classList.remove("show");$("#menuToggle").setAttribute("aria-expanded","false"); }
  function findTalent(key){ return state.talents.find(t=>keyOf(t)===key || String(t.id).toLowerCase()===key.toLowerCase()); }
  function openProfile(key){
    const t=findTalent(key); if(!t)return;
    const branch=t.branch||"jp", colors=branchColors[branch]||branchColors.default;
    const initials=String(t.name).split(/\s+/).slice(0,2).map(s=>s[0]).join("").toUpperCase();
    const image=t.image?`<img src="${escapeHTML(t.image)}" alt="${escapeHTML(t.name)}" onerror="this.remove();this.parentElement.textContent='${escapeHTML(initials)}'">`:escapeHTML(initials);
    const links=[];
    const youtube=t.youtube || (t.channel_id ? `https://www.youtube.com/channel/${t.channel_id}` : "");
    if(youtube) links.push(`<a href="${escapeHTML(youtube)}" target="_blank" rel="noreferrer">YouTube ↗</a>`);
    if(t.twitter) links.push(`<a href="${escapeHTML(String(t.twitter).startsWith("http")?t.twitter:"https://x.com/"+String(t.twitter).replace(/^@/,""))}" target="_blank" rel="noreferrer">X / Twitter ↗</a>`);
    if(t.official) links.push(`<a href="${escapeHTML(t.official)}" target="_blank" rel="noreferrer">Situs resmi ↗</a>`);
    const saved=state.favorites.has(keyOf(t));
    $("#profileContent").innerHTML=`<div class="profile-banner" style="background:linear-gradient(125deg,${colors[0]},#f4f7ff)"><div class="profile-avatar">${image}</div></div>
      <div class="profile-body"><div class="profile-branch">${escapeHTML(branchNames[branch]||"HOLOLIVE TALENT")}</div><h2 id="profileName">${escapeHTML(t.name)}</h2><div class="profile-native">${escapeHTML(t.nativeName||"")}</div>
      <p class="profile-bio">${escapeHTML(t.bio || "Profil talent ini belum memiliki deskripsi pada database. Tambahkan field bio pada JSON repository untuk menampilkan informasi lebih lengkap.")}</p>
      <div class="profile-details"><div class="detail-box"><small>BRANCH / UNIT</small><strong>${escapeHTML(branchNames[branch]||"Hololive")}</strong></div><div class="detail-box"><small>GENERASI</small><strong>${escapeHTML(t.generation||"—")}</strong></div><div class="detail-box"><small>DEBUT</small><strong>${escapeHTML(t.debut||"Belum tersedia")}</strong></div><div class="detail-box"><small>STATUS</small><strong>${isAlum(t)?"Alumni":"Talent"}</strong></div></div>
      <div class="profile-links">${links.join("")}<button data-favorite="${escapeHTML(keyOf(t))}">${saved?"♥ Tersimpan":"♡ Simpan favorit"}</button><a href="https://hololive.hololivepro.com/en/talents/" target="_blank" rel="noreferrer">Cek official page ↗</a></div></div>`;
    $("#profileBackdrop").classList.remove("hidden");
    document.body.style.overflow="hidden";
  }
  function closeProfile(){ $("#profileBackdrop").classList.add("hidden");document.body.style.overflow=""; }
  function toggleFavorite(key){
    const t=findTalent(key);if(!t)return;
    const k=keyOf(t);
    state.favorites.has(k)?state.favorites.delete(k):state.favorites.add(k);
    saveFavorites();render();
    if(!$("#profileBackdrop").classList.contains("hidden"))openProfile(k);
  }
  document.addEventListener("click",e=>{
    const nav=e.target.closest("[data-page]"); if(nav){go(nav.dataset.page);return;}
    const goBtn=e.target.closest("[data-go]"); if(goBtn){go(goBtn.dataset.go);return;}
    const fav=e.target.closest("[data-favorite]");if(fav){e.stopPropagation();toggleFavorite(fav.dataset.favorite);return;}
    const card=e.target.closest("[data-profile]");if(card){openProfile(card.dataset.profile);return;}
    const filter=e.target.closest("[data-filter]");if(filter){state.filter=filter.dataset.filter;$$(".filter-pill").forEach(p=>p.classList.toggle("selected",p===filter));render();return;}
  });
  grid.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches("[data-profile]")){e.preventDefault();openProfile(e.target.dataset.profile);}});
  $("#menuToggle").addEventListener("click",()=>$("#sidebar").classList.contains("open")?closeMenu():openMenu());
  $("#scrim").addEventListener("click",closeMenu);
  $("#searchInput").addEventListener("input",e=>{state.query=e.target.value;$("#clearSearch").style.display=state.query?"block":"none";render();});
  $("#clearSearch").addEventListener("click",()=>{$("#searchInput").value="";state.query="";$("#clearSearch").style.display="none";render();$("#searchInput").focus();});
  $("#focusSearch").addEventListener("click",()=>{if(window.innerWidth<=760){go("home");}$("#directory").scrollIntoView({behavior:"smooth"});setTimeout(()=>$("#searchInput").focus(),250);});
  document.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#directory").scrollIntoView({behavior:"smooth"});$("#searchInput").focus();}if(e.key==="Escape"){closeProfile();closeMenu();}});
  $("#closeProfile").addEventListener("click",closeProfile);
  $("#profileBackdrop").addEventListener("click",e=>{if(e.target===$("#profileBackdrop"))closeProfile();});
  $("#exploreBtn").addEventListener("click",()=>$("#directory").scrollIntoView({behavior:"smooth"}));
  $("#resetFilters").addEventListener("click",()=>{state.filter="all";state.query="";$("#searchInput").value="";$$(".filter-pill").forEach(p=>p.classList.toggle("selected",p.dataset.filter==="all"));render();});
  $("#retryData").addEventListener("click",loadData);
  window.addEventListener("hashchange",()=>{const page=location.hash.replace("#","");if(["home","id","jp","en","asobi","favorites","about"].includes(page)&&page!==state.page)go(page);});
  // Tentang proyek ditampilkan sebagai halaman konten, tanpa reload browser.
  const originalRender=render;
  render=function(){
    if(state.page==="about"){
      $$(".nav-item").forEach(btn=>btn.classList.toggle("active",btn.dataset.page==="about"));
      grid.classList.add("hidden");$("#emptyState").classList.add("hidden");
      $("#directoryTitle").innerHTML="Tentang proyek<span>.</span>";
      $("#directorySubtitle").textContent="Informasi VTUBE XSPACE dan cara menghubungkan JSON GitHub.";
      $("#filterPills").classList.add("hidden");$("#resultCount").textContent="PROJECT INFO";
      let about=$("#aboutContent");
      if(!about){about=document.createElement("section");about.id="aboutContent";about.className="about-page";$("#directory").appendChild(about);}
      about.innerHTML=`<div class="eyebrow"><span class="eyebrow-line"></span> ABOUT THIS SPACE</div><h1>More than a list.<br><span>A place to discover.</span></h1><p class="lead">VTUBE XSPACE adalah proyek fan-made untuk membantu penggemar menemukan informasi talent hololive production lewat antarmuka yang sederhana, cepat, dan nyaman di perangkat mobile.</p>
      <div class="about-card"><h3>01 / Hubungkan JSON GitHub</h3><p>Upload file JSON ke repository GitHub, lalu buka <code>config.js</code> dan isi <code>GITHUB_JSON_URL</code> dengan alamat RAW file JSON.</p><p>Format yang didukung: array talent langsung, atau object dengan properti <code>talents</code> / <code>data</code>.</p></div>
      <div class="about-card"><h3>02 / Field JSON yang direkomendasikan</h3><p>Setiap talent dapat memiliki field <code>id</code>, <code>name</code>, <code>nativeName</code>, <code>branch</code>, <code>generation</code>, <code>image</code>, <code>bio</code>, <code>debut</code>, <code>youtube</code>, <code>twitter</code>, <code>official</code>, dan <code>status</code>.</p><p>Nilai branch yang dikenali: <code>ID</code>, <code>JP</code>, <code>EN</code>, dan <code>ASOBI</code>.</p></div>
      <div class="about-card"><h3>03 / Catatan</h3><p>Website ini bukan situs resmi dan tidak berafiliasi dengan COVER Corp. Informasi, gambar, dan merek talent tetap milik pemilik masing-masing. Periksa sumber dan izin aset yang digunakan.</p><p>Referensi resmi: <a href="https://hololive.hololivepro.com/en/talents/" target="_blank" rel="noreferrer">hololive official talent page ↗</a></p></div>`;
      $("#loadNote").style.display="none";
      updateStats();return;
    }
    const about=$("#aboutContent");if(about)about.remove();$("#loadNote").style.display="";
    originalRender();
  };
  const oldGo=go;
  go=function(page){oldGo(page);if(page==="about")render();};
  // Initial route
  const initial=location.hash.replace("#","");state.page=["id","jp","en","asobi","favorites","about"].includes(initial)?initial:"home";
  loadData();
})();