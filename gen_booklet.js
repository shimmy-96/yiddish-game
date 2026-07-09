global.window={};require("./data.js");
const Y=window.YID, fs=require("fs");
const CB=Y.CONJUGATION_BANK, ST=Y.STORIES, FB=Y.FILL_IN_BANK;
const esc=s=>(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

// ---- verb bucket (balance) ----
function bucket(v){const t=new Set(v.tags||[]);
  if(t.has("zikh"))return "zikh";
  if(/\s/.test(v.infinitive)||["זײַן","האָבן"].includes(v.infinitive)||v.infinitive.indexOf("ווער")===0)return "special";
  if(t.has("prefix_fixed"))return "inseparable";
  if(t.has("prefix_split"))return "separable";
  if(t.has("motion"))return "motion";
  return "regular";}
const BLBL={regular:"רגיל",motion:"תנועה",separable:"מתפרק",inseparable:"בלתי-מתפרק",zikh:"זיך (חוזר)",special:"מיוחד"};

// each verb used exactly once across the 6 exams, 10 per exam, balanced by bucket
function assignVerbs(){
  const byB={}; CB.forEach(v=>{(byB[bucket(v)]=byB[bucket(v)]||[]).push(v);});
  Object.values(byB).forEach(a=>a.sort((x,y)=>x.id-y.id));
  const exams=[[],[],[],[],[],[]];
  // round-robin deal each bucket's verbs across exams
  Object.keys(byB).forEach(b=>{byB[b].forEach((v,i)=>{exams[i%6].push(v);});});
  // balance to exactly 10 each by moving overflow
  let flat=[]; exams.forEach((e,i)=>e.forEach(v=>flat.push({v,i})));
  // rebuild: sort all verbs, deal 10 to each keeping bucket spread
  const all=CB.slice().sort((a,b)=>bucket(a).localeCompare(bucket(b))||a.id-b.id);
  const res=[[],[],[],[],[],[]];
  all.forEach((v,idx)=>res[idx%6].push(v));
  return res; // each length 10
}

// ---- error generators (deliberately-wrong, data-derived) ----
function dropGe(s){return s.replace("גע","");}
function hasGe(s){return s.indexOf("גע")>=0;}
function swapAux(s){
  // swap zayn <-> hobn auxiliary words
  const map=[["בין","האָב"],["ביסט","האָסט"],["איז","האָט"],["זײַנען","האָבן"],["זײַט","האָט"]];
  for(const [a,b] of map){if(new RegExp("(^|\\s)"+a+"(\\s|$)").test(s))return s.replace(a,b);}
  for(const [a,b] of map){if(new RegExp("(^|\\s)"+b+"(\\s|$)").test(s))return s.replace(b,a);}
  return dropGe(s);
}
function wrongPast(v){ // one clearly-wrong past form for "fix the error"
  if(hasGe(v.past))return {wrong:dropGe(v.past),why:"חסר גע בצורת הבינוני."};
  return {wrong:swapAux(v.past),why:"עזר לא נכון (האָבן↔זײַן)."};
}
function choiceOptions(v){ // 4 options for choosing correct past
  const c=v.past, set=new Set([c]);
  if(hasGe(c))set.add(dropGe(c));
  set.add(swapAux(c));
  set.add(v.future); // future as a foil
  let opts=[...set].slice(0,4);
  while(opts.length<4)opts.push(v.negative);
  // deterministic shuffle by id
  opts=opts.slice(0,4);
  const order=[ (v.id*3)%4,(v.id*7)%4,(v.id*5)%4,(v.id)%4 ];
  const seen=[],out=[];
  // simple stable rotate
  const rot=v.id%4; out.push(...opts.slice(rot),...opts.slice(0,rot));
  return {opts:out, correct:c};
}

// ---- conjugation question formats ----
// returns {q, ans, exp, tip}
function conjQ(v, fmt){
  const head=`הפועל <b class="yid">${esc(v.infinitive)}</b> · משפט ההווה: <span class="yid">${esc(v.presentSentence)}</span>`;
  const tr="תרגום: "+esc(v.translation);
  const base=esc(v.explanation||"");
  switch(fmt){
    case "past": return {q:`${head}<br>הטה/י את המשפט ל<b>עבר</b>:`, ans:v.past, exp:base, tip:"עבר: עזר "+( /(^|\s)(בין|ביסט|איז|זײַנען|זײַט)(\s|$)/.test(v.past)?"זײַן (פועל תנועה/מצב)":"האָבן")+" + צורת בינוני.", tr};
    case "future": return {q:`${head}<br>הטה/י את המשפט ל<b>עתיד</b>:`, ans:v.future, exp:base, tip:"עתיד = וועלן (וועל/וועסט/וועט/וועלן) + שם הפועל.", tr};
    case "imperative": return {q:`${head}<br>כתוב/כתבי את צורת ה<b>ציווי</b> (יחיד + רבים):`, ans:v.imperative, exp:base, tip:"ציווי: שורש (יחיד), +ט (רבים). פועל מתפרק — התחילית בסוף.", tr};
    case "negative": return {q:`${head}<br>כתוב/כתבי את המשפט ב<b>שלילה</b>:`, ans:v.negative, exp:base, tip:"נישט (מיודע/תואר) · נישט קיין (מושא לא-מיודע).", tr};
    case "posq": return {q:`${head}<br>כתוב/כתבי <b>שאלה עם צי</b> (שאלה+):`, ans:v.positiveQuestion, exp:base, tip:"שאלה+ = צי + פועל + נושא. דו מתחבר לפועל: קומסט→קומסטו.", tr};
    case "negq": return {q:`${head}<br>כתוב/כתבי <b>שאלה בלי צי</b> (שאלה−, היפוך):`, ans:v.negativeQuestion, exp:base, tip:"שאלה− = פועל + נושא, בלי צי.", tr};
    case "fix": { const w=wrongPast(v); return {q:`${head}<br><b>תקן/י את הטעות</b> במשפט העבר: <span class="yid err">${esc(w.wrong)}</span>`, ans:v.past, exp:w.why+" הצורה הנכונה: "+esc(v.past), tip:"בדוק/בדקי גע, עזר האָבן/זײַן, ו־זיך בפעלים חוזרים.", tr}; }
    case "choice": { const c=choiceOptions(v); return {q:`${head}<br><b>בחר/י את צורת העבר הנכונה</b>:<br>${c.opts.map((o,i)=>`<span class="opt yid">${String.fromCharCode(1488+i)}. ${esc(o)}</span>`).join(" ")}`, ans:v.past, exp:"הצורה הנכונה: "+esc(v.past)+". "+base, tip:"פסול צורות בלי גע או עם עזר שגוי.", tr}; }
  }
}
const CFMT=["past","future","imperative","negative","posq","fix","choice","past","negative","future"];

// ---- fill-in question ----
function fillQ(f){
  return {q:`השלם/י: <span class="yid">${esc(f.prompt)}</span><br><span class="opt">מחסן: ${f.options.map(o=>`<span class="yid">${esc(o)}</span>`).join(" · ")}</span>`,
    ans:f.correctAnswer, exp:f.explanation, tip:"בחר/י לפי הגוף / הכלל הדקדוקי, לא לפי ניחוש.", tr:""};
}

// ---- story block ----
function storyBlock(story, qs){
  // qs: array of question objects
  return qs;
}

// ---- build one exam ----
// pattern of 28 types (mixed, story clustered in two blocks of 4)
const PATTERN=["F","F","F","F","C","C","C","S","S","S","S","C","C","C","C","F","F","F","F","S","S","S","S","C","C","C","F","F"];
function buildExam(n, verbs){
  const story=ST[n%3];
  const sQ=story.questions.slice(); // 8
  // rotate story questions order per exam for variety
  const rot=n%8; const sOrdered=sQ.slice(rot).concat(sQ.slice(0,rot));
  const fills=[]; for(let i=0;i<10;i++){fills.push(FB[(n*10+i)%FB.length]);}
  let ci=0,si=0,fi=0;
  const items=[];
  PATTERN.forEach(t=>{
    if(t==="C"){const v=verbs[ci];const fmt=CFMT[(ci+n)%CFMT.length];const q=conjQ(v,fmt);items.push({type:"הטיה/דקדוק",bucket:BLBL[bucket(v)],...q});ci++;}
    else if(t==="F"){const f=fills[fi%fills.length];const q=fillQ(f);items.push({type:"שיבוץ",bucket:f.type,...q});fi++;}
    else {const sq=sOrdered[si];items.push({type:"סיפור",bucket:story.titleYiddish,q:`<span class="yid">${esc(sq.questionYiddish)}</span>`,ans:sq.modelAnswerYiddish,exp:sq.note||"",tip:"ענה/עני ביידיש במשפט שלם.",tr:"",isStory:true});si++;}
  });
  return {n, story, items};
}

// ---- render HTML ----
function ansLines(n){return `<div class="alines">${Array(n).fill('<div class="al"></div>').join("")}</div>`;}
function renderExam(ex){
  let firstStory=true;
  const qs=ex.items.map((it,idx)=>{
    let storyHdr="";
    if(it.isStory && firstStory){firstStory=false;}
    const lines = it.isStory?2 : (it.type==="שיבוץ"?1:2);
    return `<div class="q">
      <div class="qh"><span class="qn">${idx+1}</span><span class="qt">${it.type} · ${esc(it.bucket)}</span></div>
      <div class="qb">${it.q}</div>
      ${ansLines(lines)}
    </div>`;
  }).join("\n");
  return `<section class="exam"><h2 class="eh">מבחן מדומה מספר ${ex.n+1} — יידיש</h2>
    <div class="ebar">⏱️ זמן מומלץ: 45–60 דקות · ✍️ 28 שאלות · 🚫 בלי תרגום בזמן המבחן · כתבו תשובות מלאות וברורות</div>
    <div class="snote">שאלות הסיפור מתייחסות ל: <b class="yid">${esc(ex.story.titleYiddish)}</b> — ${esc(ex.story.titleHebrew)} (${esc(ex.story.subtitle)}). ענו ביידיש במשפט שלם.</div>
    ${qs}
  </section>`;
}
function renderSol(ex){
  const rows=ex.items.map((it,idx)=>`<div class="s">
    <div class="sh"><span class="sn">${idx+1}</span><span class="sa yid">${esc(it.ans)}</span></div>
    ${it.exp?`<div class="se">${esc(it.exp)}</div>`:""}
    ${it.tr?`<div class="st">${esc(it.tr)}</div>`:""}
    ${it.tip?`<div class="sp">💡 דגש למבחן: ${esc(it.tip)}</div>`:""}
  </div>`).join("\n");
  return `<section class="sol"><h2 class="sohd">פתרונות והסברים — מבחן מספר ${ex.n+1}</h2>${rows}</section>`;
}

const verbSets=assignVerbs();
const exams=[0,1,2,3,4,5].map(n=>buildExam(n, verbSets[n]));

const toc=exams.map(e=>`<li>מבחן מדומה מספר ${e.n+1} — יידיש <span class="dots"></span> <span class="tstory yid">${esc(e.story.titleYiddish)}</span></li>`).join("");
const body=exams.map(e=>`${renderExam(e)}${renderSol(e)}`).join("\n");

const html=`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>מבחנים מדומים ביידיש</title>
<style>
:root{--ink:#1a1a1a;--soft:#555;--faint:#888;--line:#d8d0be;--teal:#0B6B60;--gold:#9a6a12;--bg:#fff;--card:#faf7ef;--errbg:#fbe6e0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Assistant","Heebo","Arial Hebrew",Arial,sans-serif;color:var(--ink);line-height:1.55;font-size:12.5pt}
.yid{font-family:"Frank Ruhl Libre","Times New Roman","David",serif;direction:rtl;unicode-bidi:isolate}
.err{background:var(--errbg);padding:0 5px;border-radius:4px;text-decoration:line-through}
.opt{color:var(--soft);font-size:11pt}
.opt .yid{background:#f0ece0;border-radius:5px;padding:1px 7px;display:inline-block;margin:2px 1px}
/* cover */
.cover{height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;page-break-after:always;background:linear-gradient(160deg,#f4f0e6,#e9e2cf)}
.cover .big{font-size:40pt;font-weight:800;color:var(--teal);margin-bottom:8px}
.cover .em{font-size:60pt}
.cover .s2{font-size:16pt;color:var(--soft);margin-top:6px}
.cover .meta{margin-top:26px;font-size:12pt;color:var(--faint);line-height:2}
.toc{page-break-after:always;padding:40px 30px}
.toc h2{color:var(--teal);font-size:22pt;margin-bottom:16px;border-bottom:3px solid var(--teal);padding-bottom:6px}
.toc ol{list-style:none;counter-reset:t}
.toc li{display:flex;align-items:baseline;gap:8px;padding:9px 0;font-size:13pt;border-bottom:1px dotted var(--line)}
.tstory{color:var(--teal);font-weight:600}
/* exam */
.exam{page-break-before:always;padding:24px 26px}
.eh{font-size:20pt;color:var(--teal);border-bottom:3px solid var(--teal);padding-bottom:6px;margin-bottom:8px}
.ebar{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 12px;font-size:10.5pt;color:var(--soft);margin-bottom:8px}
.snote{font-size:11pt;color:var(--soft);margin-bottom:14px;background:#f3f6f5;border-inline-start:4px solid var(--teal);padding:7px 12px;border-radius:6px}
.q{border:1px solid var(--line);border-radius:9px;padding:10px 13px;margin-bottom:11px;break-inside:avoid;background:var(--bg)}
.qh{display:flex;align-items:center;gap:9px;margin-bottom:5px}
.qn{background:var(--teal);color:#fff;font-weight:800;min-width:24px;height:24px;border-radius:99px;display:inline-flex;align-items:center;justify-content:center;font-size:11pt}
.qt{font-size:9.5pt;color:var(--gold);font-weight:700;letter-spacing:.3px}
.qb{font-size:12.5pt;margin-bottom:7px}
.alines{margin-top:4px}
.al{border-bottom:1px solid #cfcabb;height:19px;margin:5px 0}
/* solutions */
.sol{page-break-before:always;padding:24px 26px;background:#fbfaf6}
.sohd{font-size:18pt;color:var(--gold);border-bottom:3px solid var(--gold);padding-bottom:6px;margin-bottom:14px}
.s{border:1px solid var(--line);border-radius:8px;padding:9px 12px;margin-bottom:9px;break-inside:avoid;background:#fff}
.sh{display:flex;align-items:baseline;gap:9px;margin-bottom:3px}
.sn{background:var(--gold);color:#fff;font-weight:800;min-width:22px;height:22px;border-radius:99px;display:inline-flex;align-items:center;justify-content:center;font-size:10.5pt}
.sa{font-size:13.5pt;font-weight:600;color:#0a4a43}
.se{font-size:11pt;color:#333;margin:2px 0}
.st{font-size:11pt;color:var(--soft);font-style:italic}
.sp{font-size:10.5pt;color:var(--teal);background:#eef5f3;border-radius:5px;padding:3px 9px;margin-top:4px;display:inline-block}
.footnote{padding:20px 30px;font-size:11pt;color:var(--soft);text-align:center;page-break-before:always}
@page{size:A4;margin:14mm}
</style></head><body>
<div class="cover"><div class="em">🎯</div><div class="big">מבחנים מדומים ביידיש</div><div class="s2">הכנה למבחן — 6 מבחנים מלאים + פתרונות</div>
  <div class="meta">כל מבחן: 28 שאלות · 10 הטיות/דקדוק · 8 סיפור · 10 שיבוצים<br>מבוסס אך ורק על חומר הקורס: 60 הטיות (עמ׳ 84+100) · 3 סיפורים · בנק שיבוצים<br>גב׳ ורד קופל · שנתי תשפ״ו</div></div>
<div class="toc"><h2>תוכן עניינים</h2><ol>${toc}</ol>
  <p style="margin-top:18px;font-size:11pt;color:#666">מבנה כל מבחן: שאלות מעורבבות (שיבוצים · הטיות · סיפור · דקדוק). מיד אחרי כל מבחן — פתרונות מלאים עם הסבר, תרגום ודגשים.</p></div>
${body}
<div class="footnote">אם משהו בחומר לא ברור — אל תנחש/י. סמן/י לעצמך והשתמש/י רק במה שמופיע בוודאות בקבצים. 🍀 בהצלחה!</div>
</body></html>`;

const outHtml="/Users/shimonkapiloff/Projects/_Studying/08_יידיש/30_מבחנים/מבחנים_מדומים_חוברת.html";
fs.writeFileSync(outHtml,html);
// quality check
let ok=true;
exams.forEach(e=>{
  const c=e.items.filter(i=>i.type==="הטיה/דקדוק").length;
  const s=e.items.filter(i=>i.type==="סיפור").length;
  const f=e.items.filter(i=>i.type==="שיבוץ").length;
  if(e.items.length!==28||c!==10||s!==8||f!==10){ok=false;console.log("EXAM",e.n+1,"BAD",{total:e.items.length,c,s,f});}
});
console.log("exams:",exams.length,"quality:",ok?"OK (6×28, 10/8/10 each)":"FAIL");
console.log("wrote",outHtml);
