global.window={};require("./data.js");
const Y=window.YID, fs=require("fs");
const ST=Y.STORIES;
const STORY_TEXT=JSON.parse(fs.readFileSync("stories_full.json","utf8"));
const SK=["p","s","b"];
const esc=s=>(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const QGLOSS={
 p:["מי היו הנאצים?","מה זה גטו?","מה עשו הנאצים ליהודי הגטו?","בגלל מה נשארה וולאדקה בצד השני של החומה?","מתי החליטו הצעירים הגיבורים לעשות מרד?","כיצד הבריחה וולאדקה דינמיט לגטו?","מה קרה כשוולאדקה הייתה על חומת הגטו?","מה הייתה הסכנה בקפיצה מחומת הגטו?"],
 s:["היכן עומד הבית?","למה מתפלאים האנשים?","איך קראו לבעל הבית?","מתי קרה הסיפור?","מה אמרה המחשבה הראשונה?","מה הוא ראה?","מה אמר הזקן?","מה הוא עושה כל חורף?"],
 b:["את מי אהב העץ?","מה אסף הילד?","במה שיחקו?","מה נתן העץ?","למה רצה הילד ספינה?","מה עשה הילד עם התפוחים?","למה היה העץ עצוב?","למה רצה הילד בית?"]
};
const SUMMARY={
 p:"הגרמנים כבשו את ורשה וכלאו את היהודים בגטו מוקף חומה, בשמירת נאצים עם רובים. שררו רעב ומחלות, והנאצים הרגו יהודים בגז. הצעירים הגיבורים החליטו למרוד ונזקקו לנשק מבחוץ. וולאדקה — שלא נראתה יהודייה — נשארה מחוץ לחומה כדי לעזור, והבריחה דינמיט ארוז כמו חבילת חמאה: ישבה על החומה, נשמעו יריות, חבר קרא לה, היא החליקה פנימה ומסרה את הדינמיט.",
 s:"בכל לילה חורפי דולקת קערית שמן על חלון ביתו של אברהם. כששאלו ילדיו למה, סיפר: לפני כ-20 שנה, בגיל 19, נשאר יתום ולבד. ביום חורפי נפל בסופת שלגים; מחשבה אחת דחקה בו לקום, השנייה לישון. הוא ראה אור קטן מרחוק, נגרר אליו והתעלף. משפחה טיפלה בו — היה ליל חנוכה והאור היה נר חנוכה. הוא נשאר, התחתן עם בתם. מאז מדליק כל חורף קערית שמן — כדי שמאחרים בדרכים לא יאבדו.",
 b:"עץ אהב ילד קטן: הילד אסף עלים, טיפס, אכל תפוחים ושיחק. הילד גדל וביקש — כסף (העץ נתן תפוחים למכור), בית (נתן ענפים), ספינה (נתן גזע). הילד נעלם זמן רב והעץ התעצב. בסוף חזר זקן וביקש רק מקום לנוח, והעץ נתן את הגדם. העץ היה מאושר שנתן הכול."
};
function norm(w){return (w||"").replace(/[֑-ׇ]/g,"").replace(/[.,!?;:"'׳״\-–—()״]/g,"")
  .replace(/ך/g,"כ").replace(/ם/g,"מ").replace(/ן/g,"נ").replace(/ף/g,"פ").replace(/ץ/g,"צ").trim();}
const STOP=new Set(["אַ","די","דער","דאָס","און","אין","מיט","צו","פֿון","אויף","איז","זײַנען","האָבן","האָט","זיך","עס","ווי","נאָר","אַז"].map(norm));
const QWORDS=new Set(["ווער","וואָס","וווּ","ווו","ווען","פֿאַרוואָס","וויפֿל","ווי","צוליב","וועמען"].map(norm));
function classify(q,a){const qs=new Set(q.split(/\s+/).map(norm).filter(Boolean));
  return a.split(/\s+/).map(t=>{const n=norm(t);if(!n)return{t,c:""};if(QWORDS.has(n)||qs.has(n))return{t,c:"q"};return{t,c:"s"};});}
function skeleton(q,a){return classify(q,a).filter(o=>o.c==="q").map(o=>o.t).join(" ");}
function storyToks(q,a){return classify(q,a).filter(o=>o.c==="s").map(o=>norm(o.t)).filter(n=>n&&!STOP.has(n));}
function sentences(t){return t.replace(/\n/g," ").split(/(?<=[.?!])\s+/).map(s=>s.trim()).filter(s=>s.length>3);}
function excerpt(txt,q,a){const toks=new Set(storyToks(q,a));if(!toks.size)return null;
  const sc=sentences(txt).map((s,i)=>{const sn=s.split(/\s+/).map(norm);let m=0;sn.forEach(w=>{if(toks.has(w))m++;});return{s,i,m};});
  sc.sort((x,y)=>y.m-x.m);if(sc[0].m===0)return null;
  let ch=[sc[0]];if(sc[1]&&sc[1].m>=Math.max(2,sc[0].m-1)&&Math.abs(sc[1].i-sc[0].i)===1)ch.push(sc[1]);
  ch.sort((a,b)=>a.i-b.i);
  return ch.map(c=>c.s.split(/\s+/).map(w=>toks.has(norm(w))?`<b class="pull">${esc(w)}</b>`:esc(w)).join(" ")).join(" … ");}
function ansHtml(q,a){return classify(q,a).map(o=>o.c?`<span class="w-${o.c}">${esc(o.t)}</span>`:esc(o.t)).join(" ");}
// tip by question word
function qword(q){return norm(q.split(/\s+/)[0]);}
function addTip(q){const w=qword(q);
  if(["פֿאַרוואָס","צוליב"].includes(w)||/צוליב/.test(q))return "סיבה — מוסיפים <b>ווײַל</b> (כי) או <b>כּדי צו</b> (כדי ל־) + המידע מהסיפור.";
  if(w==="ווען")return "זמן — מוסיפים זמן מהסיפור, אפשר עם <b>ווען</b> (כאשר).";
  if(w==="ווו"||w==="וווּ")return "מקום — מוסיפים את המקום אחרי הפועל.";
  if(w==="ווי")return "דרך — מוסיפים <b>איך/במה</b> נעשתה הפעולה (המכשיר/האופן מהסיפור).";
  if(w==="ווער")return "אדם/קבוצה — משלימים מי, אחרי שלד השאלה.";
  if(w==="וועמען")return "מושא — משלימים <b>את מי</b> (המושא מהסיפור).";
  if(w==="וויפֿל")return "כמות — משלימים מספר/כמות מהסיפור.";
  return "משלימים את <b>המושא/הפעולה</b> מהסיפור אחרי שלד השאלה.";}

const QWLABEL={"ווער":"מי","וועמען":"את מי","וואָס":"מה","ווו":"איפה","וווּ":"איפה","ווען":"מתי","פֿאַרוואָס":"למה","צוליב":"בגלל מה","ווי":"איך","וויפֿל":"כמה"};

const stories=ST.map((story,si)=>{
  const sk=SK[si],gl=QGLOSS[sk],txt=STORY_TEXT[sk];
  const cards=story.questions.map((qq,i)=>{
    const q=qq.questionYiddish,a=qq.modelAnswerYiddish;
    const ex=excerpt(txt,q,a);
    const w=qword(q),wl=QWLABEL[w]||"";
    return `<div class="q">
      <div class="qh"><span class="qn">${i+11}</span><span class="yid qq">${esc(q)}</span>${wl?`<span class="qwtag">${esc(w)} = ${wl}</span>`:""}</div>
      <div class="qtr">${esc(gl[i]||"")}</div>
      <div class="grid">
        <div class="g g1"><span class="glbl">🔁 שלד מהשאלה</span><span class="yid">${esc(skeleton(q,a))||"—"}…</span></div>
        <div class="g g2"><span class="glbl">📖 מקטע מהסיפור</span><span class="yid">${ex||"—"}</span></div>
        <div class="g g3"><span class="glbl">➕ מה מוסיפים</span><span>${addTip(q)}</span></div>
      </div>
      <div class="full"><span class="glbl">✅ תשובה מלאה</span> <span class="yid">${ansHtml(q,a)}</span></div>
      <div class="ftr">${esc(qq.note||"")}</div>
    </div>`;
  }).join("");
  return `<section class="story">
    <h2 class="sh">${si+1}. <span class="yid">${esc(story.titleYiddish)}</span> · ${esc(story.titleHebrew)}</h2>
    <div class="summ"><b>תקציר:</b> ${esc(SUMMARY[sk])}</div>
    ${cards}
  </section>`;
}).join("\n");

const method=`<section class="method">
  <h2 class="mh">איך פותרים שאלת סיפור — שיטה קבועה</h2>
  <p class="lead">כל תשובה = <b>שלד מהשאלה</b> (מעתיקים נושא+פועל, הופכים למשפט) + <b>מידע מהסיפור</b> (במקום מילת השאלה) + מילת חיבור קטנה. <b>לא ממציאים יידיש.</b> תמיד עונים <b>במשפט שלם</b>, לא במילה אחת.</p>
  <table class="qwt"><thead><tr><th>מילת שאלה</th><th>בעברית</th><th>מה עונים</th></tr></thead><tbody>
    <tr><td class="yid">ווער</td><td>מי</td><td>אדם / קבוצה</td></tr>
    <tr><td class="yid">וועמען</td><td>את מי</td><td>מושא (את מי)</td></tr>
    <tr><td class="yid">וואָס</td><td>מה</td><td>דבר / פעולה</td></tr>
    <tr><td class="yid">ווו</td><td>איפה</td><td>מקום</td></tr>
    <tr><td class="yid">ווען</td><td>מתי</td><td>זמן (אפשר עם ווען = כאשר)</td></tr>
    <tr><td class="yid">פֿאַרוואָס / צוליב וואָס</td><td>למה</td><td>סיבה (ווײַל / כּדי צו)</td></tr>
    <tr><td class="yid">ווי אַזוי</td><td>איך</td><td>דרך הפעולה</td></tr>
  </tbody></table>
</section>`;

const quick=`<section class="quick"><h2 class="mh">נוסחה מהירה למבחן</h2>
  <div class="qrow"><span class="yid">וואָס האָט X געטאָן?</span> → <span class="yid">X האָט</span> + הפעולה מהסיפור.</div>
  <div class="qrow"><span class="yid">פֿאַרוואָס…?</span> → שלד + <b class="yid">ווײַל…</b> / <b class="yid">כּדי צו…</b></div>
  <div class="qrow"><span class="yid">ווען…?</span> → שלד + <b class="yid">ווען…</b> / זמן מהסיפור.</div>
  <div class="qrow"><span class="yid">ווי אַזוי…?</span> → שלד + דרך הפעולה מהסיפור.</div>
  <p class="lead" style="margin-top:10px">הכי חשוב: <b>לא להמציא יידיש חדשה</b> — הדבקה חכמה: שלד מהשאלה + מילים מהסיפור + מילת חיבור.</p>
</section>`;

const html=`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>שאלות סיפור ביידיש — שיטת פתרון מלאה</title>
<meta name="viewport" content="width=device-width, initial-scale=1"><style>
:root{--ink:#1c1c1c;--soft:#4a4a4a;--faint:#8a8a8a;--line:#d5cdbb;--teal:#0B6B60;--tealbg:#E7F1ED;--coral:#B8442B;--coralbg:#F7E4DC;--gold:#8a6410;--pullbg:#FBEBB6;--card:#fff;--soft-bg:#f7f4ec}
@media(prefers-color-scheme:dark){:root{--ink:#ECE6D6;--soft:#AFC0BC;--faint:#8598;--line:#2C3E3B;--teal:#5FD9C8;--tealbg:#173430;--coral:#EE9078;--coralbg:#3A231C;--gold:#E1AC4E;--pullbg:#5A4A1E;--card:#1A2A28;--soft-bg:#12201F}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Assistant","Heebo","Arial Hebrew",Arial,sans-serif;color:var(--ink);background:var(--card);line-height:1.5;font-size:11.5pt;padding:20px 22px}
.yid{font-family:"Frank Ruhl Libre","Times New Roman","David",serif;direction:rtl;unicode-bidi:isolate}
.wrap{max-width:860px;margin:0 auto}
h1{text-align:center;color:var(--teal);font-size:22pt;margin-bottom:2px}
.subt{text-align:center;color:var(--soft);font-size:11pt;margin-bottom:18px}
.method,.quick{background:var(--soft-bg);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin-bottom:18px}
.mh{color:var(--teal);font-size:14pt;margin-bottom:6px}
.lead{font-size:11pt;color:var(--soft)}
.qwt{width:100%;border-collapse:collapse;margin-top:10px}
.qwt th{background:var(--teal);color:#fff;padding:5px 8px;font-size:10.5pt;text-align:right}
.qwt td{border:1px solid var(--line);padding:4px 8px;font-size:10.5pt}
.qwt td:first-child{font-size:12pt;font-weight:600}
.story{margin-bottom:8px}
.sh{color:var(--teal);font-size:15pt;border-bottom:2px solid var(--teal);padding-bottom:4px;margin:22px 0 8px;page-break-after:avoid}
.summ{background:var(--tealbg);border-radius:8px;padding:8px 12px;font-size:10.8pt;margin-bottom:12px;line-height:1.65}
.q{border:1px solid var(--line);border-radius:10px;padding:10px 13px;margin-bottom:10px;break-inside:avoid}
.qh{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.qn{background:var(--teal);color:#fff;font-weight:800;min-width:23px;height:23px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10.5pt;flex:none}
.qq{font-size:13pt;font-weight:600}
.qwtag{font-size:9pt;color:var(--gold);background:var(--pullbg);border-radius:99px;padding:1px 8px}
.qtr{font-size:9.8pt;color:var(--faint);margin:1px 0 7px 31px}
.grid{display:grid;grid-template-columns:1fr 1.3fr 1fr;gap:7px;margin-bottom:7px}
.g{border:1px solid var(--line);border-radius:7px;padding:5px 8px;font-size:10.5pt;background:var(--card)}
.glbl{display:block;font-size:8.6pt;font-weight:800;color:var(--soft);margin-bottom:2px;letter-spacing:.2px}
.g1{background:var(--tealbg)} .g2 .yid{line-height:1.7}
.pull{background:var(--pullbg);border-radius:3px;padding:0 3px}
.full{border:1px dashed var(--teal);border-radius:7px;padding:6px 10px;font-size:13pt;margin-bottom:3px}
.full .glbl{display:inline;font-size:9pt}
.w-q{background:var(--tealbg);color:var(--teal);border-radius:3px;padding:0 3px}
.w-s{background:var(--coralbg);color:var(--coral);border-radius:3px;padding:0 3px}
.ftr{font-size:9.8pt;color:var(--soft);font-style:italic}
.quick .qrow{font-size:11pt;padding:3px 0;border-bottom:1px dotted var(--line)}
.legend{text-align:center;font-size:10pt;color:var(--soft);margin-bottom:16px}
.legend b{border-radius:4px;padding:1px 6px}
@media print{.q,.story,.method,.quick{break-inside:avoid}body{padding:0}}
@page{size:A4;margin:13mm}
</style></head><body><div class="wrap">
<h1>📖 שאלות סיפור ביידיש — שיטת פתרון מלאה</h1>
<div class="subt">3 הסיפורים · 24 שאלות · שלד מהשאלה + מקטע מהסיפור + מילת חיבור</div>
<div class="legend">מקרא: <b style="background:var(--tealbg);color:var(--teal)">מהשאלה</b> · <b style="background:var(--coralbg);color:var(--coral)">מהסיפור</b> · <b style="background:var(--pullbg)">✂️ הציטוט לשליפה</b></div>
${method}
${stories}
${quick}
</div></body></html>`;
const out="/Users/shimonkapiloff/Projects/_Studying/08_יידיש/40_סיכומים/שאלות_סיפור_שיטת_פתרון.html";
fs.writeFileSync(out,html);
console.log("wrote",out);
