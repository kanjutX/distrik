(function(){
  var C = window.D17 || {};
  var $ = function(s){return document.querySelector(s)};

  // links dari config
  document.querySelectorAll("[data-link]").forEach(function(a){
    var k=a.getAttribute("data-link"), v=C[k];
    if(k==="email"){ a.href="mailto:"+(v||""); var t=document.getElementById("mailTxt"); if(t&&v) t.textContent=v+" →"; return; }
    if(v) a.href=v; else a.removeAttribute("href");
  });

  // nav mobile
  var burger=$("#burger"), links=$("#navLinks");
  burger.addEventListener("click",function(){var o=links.classList.toggle("open");burger.setAttribute("aria-expanded",o)});
  links.addEventListener("click",function(e){if(e.target.tagName==="A"){links.classList.remove("open");burger.setAttribute("aria-expanded",false)}});

  // countdown
  if(C.launchDate){
    var target=new Date(C.launchDate).getTime();
    if(!isNaN(target)){
      $("#countdown").hidden=false; $("#cdNote").textContent="Beta tertutup dibuka dalam:";
      var p=function(n){return String(n).padStart(2,"0")};
      var tick=function(){
        var d=Math.max(0,target-Date.now()), s=Math.floor(d/1000);
        $("#cdD").textContent=p(Math.floor(s/86400));$("#cdH").textContent=p(Math.floor(s%86400/3600));
        $("#cdM").textContent=p(Math.floor(s%3600/60));$("#cdS").textContent=p(s%60);
        if(d<=0){$("#cdNote").textContent="Beta sudah dibuka!"}
      };
      tick(); setInterval(tick,1000);
    }
  }

  // counter + milestones
  var ms=(C.milestones||[]).slice().sort(function(a,b){return a.at-b.at});
  var count=C.preRegCount||0, fmt=function(n){return n.toLocaleString("id-ID")};
  function render(){
    $("#regCount").textContent=fmt(count);
    var next=ms.find(function(m){return count<m.at}), last=ms.length?ms[ms.length-1].at:1;
    var prev=0; ms.forEach(function(m){if(m.at<=count) prev=m.at});
    var top=next?next.at:last;
    $("#regBar").style.width=Math.min(100,Math.round((count-prev)/Math.max(1,top-prev)*100)||(count>=last?100:0))+"%";
    $("#regNext").textContent=next?("Target berikutnya: "+fmt(next.at)+" — "+next.title):"Semua hadiah sudah terbuka!";
    $("#miles").innerHTML=ms.map(function(m){
      var open=count>=m.at;
      return '<li class="'+(open?"is-open":"")+'"><b>'+fmt(m.at)+'</b><div><h3>'+m.title+'</h3><p>'+m.desc+'</p></div><span class="st">'+(open?"TERBUKA":"TERKUNCI")+'</span></li>';
    }).join("");
  }
  render();
  fetch("/api/stats").then(function(r){return r.ok?r.json():null}).then(function(j){
    if(j&&typeof j.count==="number"){count=j.count;render()}
  }).catch(function(){});

  // form
  var form=$("#regForm"), msg=$("#regMsg"), btn=$("#regBtn");
  form.addEventListener("submit",function(e){
    e.preventDefault(); msg.className="form__msg"; msg.textContent="";
    var d=new FormData(form);
    var roblox=(d.get("roblox")||"").trim(), email=(d.get("email")||"").trim();
    if(!/^[A-Za-z0-9_]{3,20}$/.test(roblox)){return fail("Username Roblox 3–20 karakter (huruf, angka, garis bawah).")}
    if(email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){return fail("Format email belum benar.")}
    if(!d.get("agree")){return fail("Centang persetujuan dulu ya.")}
    btn.disabled=true;
    fetch("/api/register",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({roblox:roblox,email:email,platform:d.get("platform"),website:d.get("website")})})
    .then(function(r){return r.json().catch(function(){return{}}).then(function(j){return{status:r.status,j:j}})})
    .then(function(x){
      if(x.status===200&&x.j.ok){ ok("Kamu sudah terdaftar, "+roblox+"! Sampai jumpa di Distrik 17."); try{localStorage.setItem("d17_reg",roblox)}catch(_){} count++;render();form.reset();}
      else if(x.status===409){ ok("Username itu sudah terdaftar. Tenang, kamu aman."); }
      else if(x.status===404){ ok("Mode pratinjau: API belum aktif, data belum tersimpan. Deploy ke Vercel untuk mengaktifkan."); }
      else fail(x.j.error||"Gagal mendaftar. Coba lagi sebentar.");
    }).catch(function(){fail("Koneksi bermasalah. Coba lagi.")}).then(function(){btn.disabled=false});
  });
  function fail(t){msg.className="form__msg err";msg.textContent=t}
  function ok(t){msg.className="form__msg ok";msg.textContent=t}

  // reveal on scroll
  var els=document.querySelectorAll(".card,.miles li,.log__item,.road__step,.faq details,.counter,.form");
  els.forEach(function(el){el.classList.add("rv")});
  if("IntersectionObserver" in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add("in");io.unobserve(x.target)}})},{threshold:.12});
    els.forEach(function(el){io.observe(el)});
  } else els.forEach(function(el){el.classList.add("in")});
})();
