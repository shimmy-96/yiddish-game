global.window={};require("./data.js");
const Y=window.YID, fs=require("fs");
const CB=Y.CONJUGATION_BANK, ST=Y.STORIES, FB=Y.FILL_IN_BANK;
const STORY_TEXT=JSON.parse(fs.readFileSync("stories_full.json","utf8")); // {p,s,b}
const STORYKEYS=["p","s","b"];
const esc=s=>(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

// Hebrew glosses for the 24 story questions (translation of the QUESTION)
const QGLOSS={
 p:["מי היו הנאצים?","מה זה גטו?","מה עשו הנאצים ליהודי הגטו?","מדוע נשארה וולאדקה בצד השני של החומה?","מתי החליטו הצעירים הגיבורים לעשות מרד?","כיצד הבריחה וולאדקה דינמיט לגטו?","מה קרה כשוולאדקה הייתה על חומת הגטו?","מה הייתה הסכנה בקפיצה מחומת הגטו?"],
 s:["היכן עומד הבית?","מדוע מתפלאים האנשים?","איך קראו לבעל הבית?","מתי קרה הסיפור?","מה אמרה המחשבה הראשונה?","מה הוא ראה?","מה אמר הזקן?","מה הוא עושה כל חורף?"],
 b:["את מי אהב העץ?","מה אסף הילד?","במה שיחקו?","מה נתן העץ?","מדוע רצה הילד ספינה?","מה עשה הילד עם התפוחים?","מדוע היה העץ עצוב?","מדוע רצה הילד בית?"]
};

// ---- verb bucket ----
function bucket(v){const t=new Set(v.tags||[]);
  if(t.has("zikh"))return "zikh";
  if(/\s/.test(v.infinitive)||["זײַן","האָבן"].includes(v.infinitive)||v.infinitive.indexOf("ווער")===0)return "special";
  if(t.has("prefix_fixed"))return "inseparable";
  if(t.has("prefix_split"))return "separable";
  if(t.has("motion"))return "motion";
  return "regular";}
function isZayn(pastStr){return /(^|\s)(בין|ביסט|איז|זײַנען|זײַט)(\s|$)/.test(pastStr||"");}
// rich דגש per verb
function verbTip(v){
  const t=new Set(v.tags||[]); const parts=[];
  parts.push(isZayn(v.past)?"עבר: עזר <b>זײַן</b> (פועל תנועה/מצב) + בינוני.":"עבר: עזר <b>האָבן</b> + צורת בינוני (גע___).");
  if(t.has("prefix_split"))parts.push("פועל <b>מתפרק</b>: בהווה/ציווי התחילית בסוף; בעבר גע באמצע (למשל אָפּ<b>גע</b>קויפֿט).");
  if(t.has("prefix_fixed"))parts.push("פועל <b>בלתי-מתפרק</b>: <b>אין גע</b> בבינוני.");
  if(t.has("zikh"))parts.push("פועל <b>חוזר</b>: <b>זיך</b> נשאר בכל הזמנים, גם בעבר.");
  if(t.has("nisht_keyn"))parts.push("שלילה: <b>נישט קיין</b> (מושא לא-מיודע).");
  else parts.push("שלילה: <b>נישט</b> (מיודע/תואר).");
  parts.push("שאלה+ = <b>צי</b> + פועל + נושא · שאלה− = היפוך בלי צי (דו מתחבר: קומסט→קומסטו).");
  return parts.join(" ");
}

// each verb once across 6 exams, balanced, mixed order within exam
function assignVerbs(){
  const all=CB.slice().sort((a,b)=>bucket(a).localeCompare(bucket(b))||a.id-b.id);
  const res=[[],[],[],[],[],[]];
  all.forEach((v,idx)=>res[idx%6].push(v));
  // reorder each exam so buckets are interleaved (mixed feel)
  res.forEach(e=>e.sort((a,b)=>((a.id*7)%11)-((b.id*7)%11)));
  return res;
}

// ---- exam builder ----
function buildExam(n, verbs){
  const sk=STORYKEYS[n%3];
  const story=ST[n%3];
  const sQ=story.questions;
  const fills=[]; for(let i=0;i<10;i++)fills.push(FB[(n*10+i)%FB.length]);
  const bankSet=[]; fills.forEach(f=>{if(!bankSet.includes(f.correctAnswer))bankSet.push(f.correctAnswer);});
  // deterministic shuffle of bank
  const bank=bankSet.slice().sort((a,b)=>((a.length*(n+3))%7)-((b.length*(n+3))%7)||a.localeCompare(b));
  return {n, sk, story, verbs, questions:sQ, fills, bank};
}

// ---- render exam body ----
const F7=[["תרגום"],["עבר"],["עתיד"],["ציווי"],["שלילה"],["שאלה +"],["שאלה −"]];
function line(){return '<span class="ln"></span>';}
function aline(){return '<div class="al"></div>';}
function stripHint(p){return (p||"").replace(/\s*\(במקור:[^)]*\)/,"");}
function renderExamBody(ex){
  // Part A
  const partA=ex.verbs.map((v,i)=>`<div class="cverb">
    <div class="cvh"><span class="cvn">${i+1}</span><span class="yid cvs">${esc(v.presentSentence)}</span><span class="cvi">· <b class="yid">${esc(v.infinitive)}</b></span></div>
    ${F7.map(([l])=>`<div class="frow"><span class="flbl">${l}:</span>${line()}</div>`).join("")}
  </div>`).join("");
  // Part B — full story then 8 Qs
  const partB=`<div class="storybox"><div class="storyh yid">${esc(ex.story.titleYiddish)}</div>
    <div class="storytxt yid">${esc(STORY_TEXT[ex.sk]).split(/\n\s*\n/).map(p=>`<p>${p.replace(/\n/g," ").trim()}</p>`).join("")}</div></div>
    <div class="binstr">ענה/עני ביידיש במשפט שלם.</div>
    ${ex.questions.map((q,i)=>`<div class="bq"><div class="bqh"><span class="cvn">${i+11}</span><span class="yid bqt">${esc(q.questionYiddish)}</span></div>${aline()}${aline()}</div>`).join("")}`;
  // Part C — shared bank + 10 fills
  const partC=`<div class="bankbox"><b>מחסן מילים משותף:</b> ${ex.bank.map(w=>`<span class="yid bw">${esc(w)}</span>`).join(" · ")}</div>
    ${ex.fills.map((f,i)=>`<div class="fq"><span class="cvn">${i+19}</span><span class="fqt yid">${esc(stripHint(f.prompt))}</span>${aline()}</div>`).join("")}`;

  return `<section class="exam">
    <div class="exhead">
      <div class="uni">אוניברסיטת בר־אילן · יידיש למתחילים</div>
      <h2 class="eh">מבחן מדומה מספר ${ex.n+1}</h2>
      <div class="idrow"><span>שם: ${line()}</span><span>ת.ז.: ${line()}</span><span>ציון: ${line()}</span></div>
      <div class="ebar">⏱️ זמן מומלץ: 60 דקות · ✍️ 28 שאלות (10 הטיות · 8 סיפור · 10 שיבוצים) · 🚫 אין להשתמש בתרגום בזמן המבחן</div>
      <div class="instr">בחלק א׳ מלא/י לכל פועל את כל שבעת השדות: <b>תרגום · עבר · עתיד · ציווי · שלילה · שאלה+ · שאלה−</b>.</div>
    </div>
    <h3 class="ph">חלק א׳ — הטיות מלאות <span class="phs">(שאלות 1–10)</span></h3>
    ${partA}
    <h3 class="ph">חלק ב׳ — שאלות על הסיפור <span class="phs">(שאלות 11–18)</span></h3>
    ${partB}
    <h3 class="ph">חלק ג׳ — שיבוצים <span class="phs">(שאלות 19–28)</span></h3>
    ${partC}
  </section>`;
}

// ---- render solutions ----
function renderSol(ex){
  const solA=ex.verbs.map((v,i)=>`<div class="sv">
    <div class="svh"><span class="svn">${i+1}</span><span class="yid">${esc(v.presentSentence)}</span> · <b class="yid">${esc(v.infinitive)}</b></div>
    <table class="svt"><tbody>
      <tr><td>תרגום</td><td>${esc(v.translation)}</td></tr>
      <tr><td>עבר</td><td class="yid">${esc(v.past)}</td></tr>
      <tr><td>עתיד</td><td class="yid">${esc(v.future)}</td></tr>
      <tr><td>ציווי</td><td class="yid">${esc(v.imperative)}</td></tr>
      <tr><td>שלילה</td><td class="yid">${esc(v.negative)}</td></tr>
      <tr><td>שאלה +</td><td class="yid">${esc(v.positiveQuestion)}</td></tr>
      <tr><td>שאלה −</td><td class="yid">${esc(v.negativeQuestion)}</td></tr>
    </tbody></table>
    <div class="tip">💡 ${verbTip(v)}</div>
  </div>`).join("");
  const gl=QGLOSS[ex.sk];
  const solB=ex.questions.map((q,i)=>`<div class="sb">
    <div class="sbh"><span class="svn">${i+11}</span><span class="yid">${esc(q.questionYiddish)}</span></div>
    <div class="sbq">תרגום השאלה: ${esc(gl[i]||"")}</div>
    <div class="sba">תשובה (יידיש): <span class="yid">${esc(q.modelAnswerYiddish)}</span></div>
    <div class="sbt">תרגום התשובה: ${esc(q.note||"")}</div>
    <div class="tip">📖 מאיפה בסיפור: ${esc(deriveHint(ex.sk,i))}</div>
  </div>`).join("");
  const solC=ex.fills.map((f,i)=>`<div class="sc">
    <div class="sch"><span class="svn">${i+19}</span><span class="yid">${esc(stripHint(f.prompt))}</span> ← <b class="yid">${esc(f.correctAnswer)}</b></div>
    <div class="sce">${esc(f.explanation)}</div>
  </div>`).join("");
  return `<section class="sol">
    <h2 class="sohd">פתרונות והסברים — מבחן מספר ${ex.n+1}</h2>
    <h3 class="soph">חלק א׳ — הטיות</h3>${solA}
    <h3 class="soph">חלק ב׳ — סיפור</h3>${solB}
    <h3 class="soph">חלק ג׳ — שיבוצים</h3>${solC}
  </section>`;
}
function deriveHint(sk,i){
  // short pointer to where in the story the answer comes from
  const H={
   p:["מהמשפט הפותח — הגרמנים והרובים.","מהתיאור של הגטו כרחובות מוקפים חומה.","מהקטע על הגזה והשריפה במחנות.","מההסבר שהיא לא נראתה יהודייה ונשארה לעזור.","מההחלטה על המרד כשנשארו מעט יהודים.","מתיאור הברחת הדינמיט בחבילת חמאה.","מהרגע על החומה — היריות ובריחת החברים.","מהמחשבות על החומה — נפילה/התפוצצות/הנאצים."],
   s:["מהפתיחה — הבית בקצה הכפר.","מהשאלה של הילדים על קערית השמן בחורף.","מהמשפט שבו האב מציג את עצמו כאברהם.","מ׳מיט אַ צוואַנציק יאָר צוריק׳.","מהמחשבה הראשונה שהעירה אותו מהשלג.","מהרגע שראה את האור הקטן מרחוק.","מהצעת הזקן להישאר ולעבוד.","מהסיום — מדוע מדליק כל חורף."],
   b:["מהמשפט הראשון — אהבת העץ לילד.","מתיאור איסוף העלים והכתרים.","מהמשחקים — מחבואים.","ממהלך הסיפור — תפוחים, ענפים, גזע.","מבקשת הספינה כדי להפליג.","מהקטע על מכירת התפוחים בשוק.","מהמשפט על העצב כשלא חזר.","מבקשת הבית — אישה וילדים."]
  };
  return H[sk][i];
}

// ---- assemble ----
const verbSets=assignVerbs();
const exams=[0,1,2,3,4,5].map(n=>buildExam(n, verbSets[n]));
const toc=exams.map(e=>`<li><span>מבחן מדומה מספר ${e.n+1}</span><span class="dots"></span><span class="tstory yid">${esc(e.story.titleYiddish)}</span></li>`).join("");
const body=exams.map(e=>`${renderExamBody(e)}${renderSol(e)}`).join("\n");

const html=`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>מבחנים מדומים ביידיש — הכנה למבחן</title>
<style>
:root{--ink:#1c1c1c;--soft:#4a4a4a;--faint:#8a8a8a;--line:#c9c2b2;--rule:#b8b0a0;--teal:#0B6B60;--teal2:#0e8a7c;--gold:#8a6410;--bg:#fff;--soft-bg:#f7f4ec}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Assistant","Heebo","Arial Hebrew",Arial,sans-serif;color:var(--ink);line-height:1.5;font-size:12pt}
.yid{font-family:"Frank Ruhl Libre","Times New Roman","David",serif;direction:rtl;unicode-bidi:isolate}
/* cover */
.cover{height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;page-break-after:always}
.cover .em{font-size:54pt}.cover .big{font-size:34pt;font-weight:800;color:var(--teal);margin:6px 0}
.cover .s2{font-size:15pt;color:var(--soft)}.cover .meta{margin-top:30px;font-size:11.5pt;color:var(--faint);line-height:2}
.toc{page-break-after:always;padding:40px 34px}
.toc h2{color:var(--teal);font-size:20pt;border-bottom:2px solid var(--teal);padding-bottom:6px;margin-bottom:14px}
.toc ol{list-style:none}.toc li{display:flex;align-items:baseline;gap:10px;padding:9px 2px;font-size:12.5pt;border-bottom:1px dotted var(--line)}
.toc .dots{flex:1;border-bottom:1px dotted var(--line);transform:translateY(-3px)}
.tstory{color:var(--teal)}
/* exam */
.exam{page-break-before:always;padding:8px 30px 20px}
.exhead{text-align:center;border-bottom:2.5px solid var(--teal);padding-bottom:8px;margin-bottom:12px}
.uni{font-size:11pt;color:var(--soft);letter-spacing:.3px}
.eh{font-size:21pt;color:var(--teal);margin:2px 0 6px}
.idrow{display:flex;justify-content:center;gap:26px;font-size:11pt;color:var(--soft);margin-bottom:8px}
.ebar{font-size:10.5pt;color:var(--soft);background:var(--soft-bg);border:1px solid var(--line);border-radius:6px;padding:6px 10px;margin:0 auto 6px;display:inline-block}
.instr{font-size:10.5pt;color:var(--soft)}
.ph{font-size:14pt;color:#fff;background:var(--teal);border-radius:6px;padding:5px 12px;margin:18px 0 10px}
.ph .phs{font-size:10.5pt;font-weight:500;opacity:.9}
/* part A */
.cverb{break-inside:avoid;border-bottom:1px solid #e6e0d2;padding:7px 0 9px;margin-bottom:2px}
.cvh{display:flex;align-items:baseline;gap:8px;margin-bottom:5px}
.cvn{background:var(--teal);color:#fff;font-weight:800;min-width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10.5pt;flex:none}
.cvs{font-size:13.5pt}.cvi{font-size:12pt;color:var(--soft)}
.frow{display:flex;align-items:baseline;gap:8px;margin:3px 0}
.flbl{width:58px;font-size:11pt;color:var(--soft);flex:none}
.ln{flex:1;border-bottom:1px solid var(--rule);height:16px;display:inline-block;min-width:120px}
/* part B */
.storybox{border:1px solid var(--line);border-radius:8px;padding:12px 15px;margin-bottom:10px;background:var(--soft-bg);break-inside:avoid}
.storyh{font-size:15pt;font-weight:700;color:var(--teal);text-align:center;margin-bottom:8px}
.storytxt{font-size:12.5pt;line-height:1.85}.storytxt p{margin-bottom:7px;text-align:justify}
.binstr{font-size:11pt;color:var(--soft);margin:6px 0 10px;font-weight:600}
.bq{break-inside:avoid;margin-bottom:9px}
.bqh{display:flex;align-items:baseline;gap:8px;margin-bottom:3px}
.bqt{font-size:13pt}
.al{border-bottom:1px solid var(--rule);height:18px;margin:6px 0}
/* part C */
.bankbox{border:1.5px dashed var(--teal);border-radius:8px;padding:9px 13px;margin-bottom:12px;font-size:12pt;line-height:1.9}
.bw{background:#eef5f3;border-radius:5px;padding:1px 9px;display:inline-block;margin:2px;font-size:12.5pt}
.fq{break-inside:avoid;display:flex;align-items:baseline;gap:8px;margin-bottom:11px}
.fqt{font-size:13pt;white-space:nowrap}
.fq .al{flex:1;min-width:90px}
/* solutions */
.sol{page-break-before:always;padding:8px 30px 20px;background:#fcfbf7}
.sohd{font-size:18pt;color:var(--gold);border-bottom:2.5px solid var(--gold);padding-bottom:6px;margin-bottom:12px}
.soph{font-size:13pt;color:var(--gold);margin:16px 0 8px;border-bottom:1px solid var(--line);padding-bottom:3px}
.sv{break-inside:avoid;margin-bottom:11px}
.svh{font-size:12pt;margin-bottom:3px}
.svn{background:var(--gold);color:#fff;font-weight:800;min-width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10pt;margin-inline-end:5px}
.svt{width:100%;border-collapse:collapse;margin:2px 0}
.svt td{border:1px solid #e2dccc;padding:3px 8px;font-size:11.5pt}
.svt td:first-child{width:66px;background:#f2eee2;color:var(--soft);font-weight:700;font-size:10.5pt}
.tip{font-size:10.5pt;color:var(--teal);background:#eef5f3;border-radius:5px;padding:4px 9px;margin-top:4px}
.sb{break-inside:avoid;margin-bottom:10px;border-bottom:1px dotted var(--line);padding-bottom:7px}
.sbh{font-size:12.5pt;margin-bottom:2px}
.sbq{font-size:11pt;color:var(--soft)}
.sba{font-size:12.5pt;margin:2px 0}
.sbt{font-size:11pt;color:var(--soft);font-style:italic}
.sc{break-inside:avoid;margin-bottom:7px}
.sch{font-size:12.5pt}.sce{font-size:11pt;color:var(--soft)}
.footnote{page-break-before:always;padding:40px 34px;font-size:12pt;color:var(--soft);text-align:center;line-height:1.9}
@page{size:A4;margin:14mm}
</style></head><body>
<div class="cover"><div class="em">🎯</div><div class="big">מבחנים מדומים ביידיש</div><div class="s2">הכנה למבחן — 6 מבחנים מלאים + פתרונות מלאים</div>
<div class="meta">מבנה כל מבחן: חלק א׳ — 10 הטיות מלאות (7 שדות) · חלק ב׳ — סיפור מלא + 8 שאלות · חלק ג׳ — 10 שיבוצים<br>מבוסס אך ורק על חומר הקורס: 60 ההטיות (עמ׳ 84+100) · 3 הסיפורים המלאים · בנק השיבוצים<br>גב׳ ורד קופל · שנתי תשפ״ו</div></div>
<div class="toc"><h2>תוכן עניינים</h2><ol>${toc}</ol>
<p style="margin-top:16px;font-size:11pt;color:#666">מיד אחרי כל מבחן מופיעים הפתרונות המלאים: לחלק א׳ — כל 7 השדות + תרגום + דגש; לחלק ב׳ — השאלה עם תרגום, תשובת המודל עם תרגום, ומאיפה בסיפור; לחלק ג׳ — התשובה + הסבר.</p></div>
${body}
<div class="footnote">🍀 בהצלחה במבחן!<br><br><b>אם משהו בחומר לא ברור — אל תנחש/י.</b><br>סמן/י לעצמך והשתמש/י רק במה שמופיע בוודאות בקבצים.</div>
</body></html>`;

const out="/Users/shimonkapiloff/Projects/_Studying/08_יידיש/30_מבחנים/מבחנים_מדומים_חוברת.html";
fs.writeFileSync(out,html);
// QA
let ok=true;
exams.forEach(e=>{if(e.verbs.length!==10||e.questions.length!==8||e.fills.length!==10){ok=false;console.log("BAD exam",e.n+1);}});
console.log("exams:",exams.length,"| each 10/8/10:",ok?"OK":"FAIL","| wrote",out);
