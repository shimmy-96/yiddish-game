global.window={};require("./data.js");
const Y=window.YID, fs=require("fs");
const ST=Y.STORIES;
const STORY_TEXT=JSON.parse(fs.readFileSync("stories_full.json","utf8"));
const SK=["p","s","b"];
const esc=s=>(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const QGLOSS={
 p:["מי היו הנאצים?","מה זה גטו?","מה עשו הנאצים ליהודי הגטו?","מדוע נשארה וולאדקה בצד השני של החומה?","מתי החליטו הצעירים הגיבורים לעשות מרד?","כיצד הבריחה וולאדקה דינמיט לגטו?","מה קרה כשוולאדקה הייתה על חומת הגטו?","מה הייתה הסכנה בקפיצה מחומת הגטו?"],
 s:["היכן עומד הבית?","מדוע מתפלאים האנשים?","איך קראו לבעל הבית?","מתי קרה הסיפור?","מה אמרה המחשבה הראשונה?","מה הוא ראה?","מה אמר הזקן?","מה הוא עושה כל חורף?"],
 b:["את מי אהב העץ?","מה אסף הילד?","במה שיחקו?","מה נתן העץ?","מדוע רצה הילד ספינה?","מה עשה הילד עם התפוחים?","מדוע היה העץ עצוב?","מדוע רצה הילד בית?"]
};
function norm(w){return (w||"").replace(/[֑-ׇ]/g,"").replace(/[.,!?;:"'׳״\-–—()]/g,"")
  .replace(/ך/g,"כ").replace(/ם/g,"מ").replace(/ן/g,"נ").replace(/ף/g,"פ").replace(/ץ/g,"צ").trim();}
const STOP=new Set(["אַ","די","דער","דאָס","און","אין","מיט","צו","פֿון","אויף","איז","זײַנען","האָבן","האָט","זיך","עס","ווי","נאָר","אַז"].map(norm));
const QWORDS=new Set(["ווער","וואָס","וווּ","ווו","ווען","פֿאַרוואָס","וויפֿל","ווי","צוליב","וועמען"].map(norm));
// classify answer tokens: from question vs from story
function classify(q,a){const qs=new Set(q.split(/\s+/).map(norm).filter(Boolean));
  return a.split(/\s+/).map(t=>{const n=norm(t);if(!n)return{t,c:""};if(QWORDS.has(n)||qs.has(n))return{t,c:"q"};return{t,c:"s"};});}
function storyPartTokens(q,a){return classify(q,a).filter(o=>o.c==="s").map(o=>norm(o.t)).filter(n=>n&&!STOP.has(n));}
// split story into sentences
function sentences(txt){return txt.replace(/\n/g," ").split(/(?<=[.?!])\s+/).map(s=>s.trim()).filter(s=>s.length>3);}
// find best-matching sentence(s) for the story-part tokens
function findExcerpt(storyTxt,q,a){
  const toks=new Set(storyPartTokens(q,a));
  if(!toks.size)return null;
  const sents=sentences(storyTxt);
  const scored=sents.map((s,i)=>{const sn=s.split(/\s+/).map(norm);let m=0;sn.forEach(w=>{if(toks.has(w))m++;});return {s,i,m};});
  scored.sort((x,y)=>y.m-x.m);
  if(scored[0].m===0)return null;
  // take best sentence; if the 2nd best is adjacent & also strong, include both in order
  const best=scored[0];
  let chosen=[best];
  const second=scored[1];
  if(second&&second.m>=Math.max(2,best.m-1)&&Math.abs(second.i-best.i)===1)chosen.push(second);
  chosen.sort((a,b)=>a.i-b.i);
  // render with pull-tokens highlighted
  const html=chosen.map(c=>c.s.split(/\s+/).map(w=>toks.has(norm(w))?`<span class="pull">${esc(w)}</span>`:esc(w)).join(" ")).join(" … ");
  return html;
}
function renderAns(q,a){return classify(q,a).map(o=>o.c?`<span class="w-${o.c}">${esc(o.t)}</span>`:esc(o.t)).join(" ");}
function fromQ(q,a){return classify(q,a).filter(o=>o.c==="q").map(o=>o.t).join(" ");}
function fromS(q,a){return classify(q,a).filter(o=>o.c==="s").map(o=>o.t).join(" ");}

const sections=ST.map((story,si)=>{
  const sk=SK[si],gl=QGLOSS[sk],txt=STORY_TEXT[sk];
  const qa=story.questions.map((qq,i)=>{
    const ex=findExcerpt(txt,qq.questionYiddish,qq.modelAnswerYiddish);
    const fq=fromQ(qq.questionYiddish,qq.modelAnswerYiddish), fsr=fromS(qq.questionYiddish,qq.modelAnswerYiddish);
    return `<div class="qa">
      <div class="qh"><span class="qn">${i+1}</span><span class="yid qq">${esc(qq.questionYiddish)}</span></div>
      <div class="qtr">${esc(gl[i]||"")}</div>
      ${ex?`<div class="exc"><span class="lbl">📖 המקטע בסיפור:</span> <span class="yid">${ex}</span></div>`:`<div class="exc none">📖 אין ציטוט ישיר — התשובה מנוסחת מהתוכן.</div>`}
      <div class="build"><span class="lbl">✍️ איך בונים:</span> <span class="c-q yid">${esc(fq||"—")}</span> <span class="plus">+</span> <span class="c-s yid">${esc(fsr||"—")}</span></div>
      <div class="ans yid">${renderAns(qq.questionYiddish,qq.modelAnswerYiddish)}</div>
      <div class="atr">${esc(qq.note||"")}</div>
    </div>`;
  }).join("");
  return `<section class="story">
    <h2 class="sh"><span class="yid">${esc(story.titleYiddish)}</span> · ${esc(story.titleHebrew)}</h2>
    <div class="sub">${esc(story.subtitle||"")}</div>
    ${qa}
  </section>`;
}).join("\n");

const html=`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>3 הסיפורים — מקטעים, תשובות ותרגום</title>
<meta name="viewport" content="width=device-width, initial-scale=1"><style>
:root{--paper:#F4F0E6;--card:#FFFDF8;--card2:#FBF7EE;--ink:#1B2A2C;--soft:#4A5A5B;--faint:#7C8A88;--line:#E2D9C6;--teal:#0B6B60;--tealbg:#E3F0EC;--coral:#C0492E;--coralbg:#F7E4DC;--gold:#9a6a12;--pull:#F2D98A}
@media(prefers-color-scheme:dark){:root{--paper:#12201F;--card:#1A2A28;--card2:#213432;--ink:#ECE6D6;--soft:#AFC0BC;--faint:#7E918D;--line:#2C3E3B;--teal:#5FD9C8;--tealbg:#173430;--coral:#EE9078;--coralbg:#3A231C;--gold:#E1AC4E;--pull:#5A4A1E}}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--paper);color:var(--ink);font-family:"Assistant","Heebo","Arial Hebrew",Arial,sans-serif;line-height:1.55;padding:18px 14px 50px}
.yid{font-family:"Frank Ruhl Libre","Times New Roman","David",serif;direction:rtl;unicode-bidi:isolate}
.wrap{max-width:800px;margin:0 auto}
h1{text-align:center;color:var(--teal);font-size:23pt;margin-bottom:3px}
.lead{text-align:center;color:var(--soft);font-size:11.5pt;margin-bottom:10px}
.legend{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:20px;font-size:10.5pt}
.legend span{padding:3px 11px;border-radius:99px;font-weight:700}
.leg-q{background:var(--tealbg);color:var(--teal)}.leg-s{background:var(--coralbg);color:var(--coral)}.leg-p{background:var(--pull);color:#6a5210}
@media(prefers-color-scheme:dark){.leg-p{color:#F2D98A}}
.story{background:var(--card);border:1px solid var(--line);border-radius:15px;padding:16px 18px;margin-bottom:20px}
.sh{font-size:17pt;color:var(--teal)}
.sub{font-size:10.5pt;color:var(--faint);margin-bottom:12px}
.qa{border:1px solid var(--line);border-radius:11px;padding:10px 13px;margin-bottom:11px;background:var(--paper)}
.qh{display:flex;align-items:baseline;gap:8px}
.qn{background:var(--teal);color:#fff;font-weight:800;min-width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10.5pt;flex:none}
.qq{font-size:13.5pt;font-weight:600}
.qtr{font-size:10pt;color:var(--faint);margin:1px 0 7px 30px}
.lbl{font-size:9.5pt;font-weight:800;color:var(--soft)}
.exc{font-size:12.5pt;line-height:1.9;background:var(--card2);border-radius:8px;padding:6px 10px;margin-bottom:6px}
.exc.none{color:var(--faint);font-size:10.5pt}
.pull{background:var(--pull);color:#5a4410;border-radius:4px;padding:0 4px;font-weight:700}
@media(prefers-color-scheme:dark){.pull{color:#F2D98A}}
.build{font-size:12pt;margin-bottom:5px}
.c-q{background:var(--tealbg);color:var(--teal);border-radius:5px;padding:1px 7px;font-weight:600}
.c-s{background:var(--coralbg);color:var(--coral);border-radius:5px;padding:1px 7px;font-weight:600}
.plus{color:var(--faint);font-weight:800;margin:0 3px}
.ans{font-size:14pt;line-height:2;border-radius:8px;padding:5px 9px;margin-bottom:3px;border:1px dashed var(--line)}
.w-q{background:var(--tealbg);color:var(--teal);border-radius:4px;padding:0 4px}
.w-s{background:var(--coralbg);color:var(--coral);border-radius:4px;padding:0 4px}
.atr{font-size:10pt;color:var(--soft);font-style:italic}
@media print{.story{break-inside:avoid}body{padding:0}}
@page{size:A4;margin:13mm}
</style></head><body><div class="wrap">
<h1>📖 שלושת הסיפורים — מה לשלוף לכל תשובה</h1>
<div class="lead">לכל שאלה: המקטע הרלוונטי בסיפור, מה למחזר מהשאלה, ומה לשלוף מהסיפור.</div>
<div class="legend"><span class="leg-q">🔁 מהשאלה</span><span class="leg-s">📖 מהסיפור</span><span class="leg-p">✂️ הציטוט לשליפה</span></div>
${sections}
</div></body></html>`;
const out="/Users/shimonkapiloff/Projects/_Studying/08_יידיש/40_סיכומים/3_סיפורים_מקטעים_ותשובות.html";
fs.writeFileSync(out,html);
console.log("wrote",out);
