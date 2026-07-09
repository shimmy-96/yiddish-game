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
// Yiddish-tolerant normalizer
function norm(w){return (w||"")
  .replace(/[֑-ׇ]/g,"")            // niqqud/cantillation
  .replace(/[.,!?;:"'׳״\-–—()]/g,"")
  .replace(/ך/g,"כ").replace(/ם/g,"מ").replace(/ן/g,"נ").replace(/ף/g,"פ").replace(/ץ/g,"צ")
  .trim();}
const QWORDS=new Set(["ווער","וואָס","ווו","וווּ","ווען","פֿאַרוואָס","וויפֿל","ווי","צוליב","וועמען","וואָסער","וועלכער","וועלכע"]);
// split answer into tokens, classify each: 'q' from question, 's' from story/new
function classify(question, answer){
  const qset=new Set(question.split(/\s+/).map(norm).filter(Boolean));
  return answer.split(/\s+/).map(tok=>{
    const n=norm(tok);
    if(!n)return {t:tok,c:""};
    if(QWORDS.has(n))return {t:tok,c:"q"};       // a question word echoed
    if(qset.has(n))return {t:tok,c:"q"};          // word taken from the question
    return {t:tok,c:"s"};                          // added from the story
  });
}
function renderAnswer(q,a){
  return classify(q,a).map(o=>o.c?`<span class="w-${o.c}">${esc(o.t)}</span>`:esc(o.t)).join(" ");
}

const sections=ST.map((story,si)=>{
  const sk=SK[si], gl=QGLOSS[sk];
  const txt=STORY_TEXT[sk].split(/\n\s*\n/).map(p=>`<p class="yid">${esc(p.replace(/\n/g," ").trim())}</p>`).join("");
  const qa=story.questions.map((qq,i)=>{
    const fromQ=classify(qq.questionYiddish,qq.modelAnswerYiddish).filter(o=>o.c==="q").map(o=>o.t).join(" ");
    const fromS=classify(qq.questionYiddish,qq.modelAnswerYiddish).filter(o=>o.c==="s").map(o=>o.t).join(" ");
    return `<div class="qa">
      <div class="qh"><span class="qn">${i+1}</span><span class="yid qq">${esc(qq.questionYiddish)}</span></div>
      <div class="qtr">תרגום השאלה: ${esc(gl[i]||"")}</div>
      <div class="ans yid">${renderAnswer(qq.questionYiddish,qq.modelAnswerYiddish)}</div>
      <div class="atr">תרגום התשובה: ${esc(qq.note||"")}</div>
      <div class="map">
        <span class="chip c-q">🔁 מהשאלה: <span class="yid">${esc(fromQ||"—")}</span></span>
        <span class="chip c-s">📖 מהסיפור: <span class="yid">${esc(fromS||"—")}</span></span>
      </div>
    </div>`;
  }).join("");
  return `<section class="story">
    <h2 class="sh"><span class="yid">${esc(story.titleYiddish)}</span> · ${esc(story.titleHebrew)}</h2>
    <div class="sub">${esc(story.subtitle||"")}</div>
    <details open class="txtwrap"><summary>📜 הסיפור המלא (יידיש)</summary><div class="storytxt">${txt}</div></details>
    <h3 class="qhd">שאלות ותשובות מודל — צבוע: מה למחזר מהשאלה, מה להוסיף מהסיפור</h3>
    ${qa}
  </section>`;
}).join("\n");

const html=`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>3 הסיפורים — שאלות, תשובות ותרגום</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root{--paper:#F4F0E6;--card:#FFFDF8;--card2:#FBF7EE;--ink:#1B2A2C;--soft:#4A5A5B;--faint:#7C8A88;--line:#E2D9C6;--teal:#0B6B60;--teal2:#0E8A7C;--tealbg:#E3F0EC;--coral:#C0492E;--coralbg:#F7E4DC;--gold:#9a6a12}
@media(prefers-color-scheme:dark){:root{--paper:#12201F;--card:#1A2A28;--card2:#213432;--ink:#ECE6D6;--soft:#AFC0BC;--faint:#7E918D;--line:#2C3E3B;--teal:#5FD9C8;--teal2:#2FC8B4;--tealbg:#173430;--coral:#EE9078;--coralbg:#3A231C;--gold:#E1AC4E}}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--paper);color:var(--ink);font-family:"Assistant","Heebo","Arial Hebrew",Arial,sans-serif;line-height:1.6;padding:20px 14px 60px}
.yid{font-family:"Frank Ruhl Libre","Times New Roman","David",serif;direction:rtl;unicode-bidi:isolate}
.wrap{max-width:820px;margin:0 auto}
h1{text-align:center;color:var(--teal);font-size:26pt;margin-bottom:4px}
.lead{text-align:center;color:var(--soft);font-size:12pt;margin-bottom:14px}
.legend{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:22px;font-size:11pt}
.legend span{padding:4px 12px;border-radius:99px;font-weight:700}
.leg-q{background:var(--tealbg);color:var(--teal)}
.leg-s{background:var(--coralbg);color:var(--coral)}
.story{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 20px;margin-bottom:22px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 8px 20px rgba(0,0,0,.05)}
.sh{font-size:19pt;color:var(--teal);margin-bottom:2px}
.sub{font-size:11pt;color:var(--faint);margin-bottom:10px}
.txtwrap{border:1px solid var(--line);border-radius:10px;background:var(--card2);margin-bottom:16px}
.txtwrap summary{cursor:pointer;font-weight:800;color:var(--teal);padding:10px 14px;font-size:12pt}
.storytxt{padding:0 16px 14px}
.storytxt p{font-size:13pt;line-height:1.9;margin-bottom:8px;text-align:justify}
.qhd{font-size:12.5pt;color:var(--gold);font-weight:800;margin:6px 0 12px;border-bottom:1px solid var(--line);padding-bottom:5px}
.qa{border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:13px;background:var(--paper)}
.qh{display:flex;align-items:baseline;gap:9px;margin-bottom:3px}
.qn{background:var(--teal);color:#fff;font-weight:800;min-width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11pt;flex:none}
.qq{font-size:14pt;font-weight:600}
.qtr{font-size:10.5pt;color:var(--faint);margin-bottom:7px}
.ans{font-size:15pt;line-height:2.1;background:var(--card2);border-radius:8px;padding:7px 11px;margin-bottom:5px}
.w-q{background:var(--tealbg);color:var(--teal);border-radius:5px;padding:1px 5px;font-weight:600}
.w-s{background:var(--coralbg);color:var(--coral);border-radius:5px;padding:1px 5px;font-weight:600}
.atr{font-size:11pt;color:var(--soft);font-style:italic;margin-bottom:7px}
.map{display:flex;gap:8px;flex-wrap:wrap}
.chip{font-size:11pt;border-radius:8px;padding:4px 10px}
.c-q{background:var(--tealbg);color:var(--teal)}
.c-s{background:var(--coralbg);color:var(--coral)}
@media print{.story{break-inside:avoid;box-shadow:none}.txtwrap summary{display:none}body{padding:0}}
@page{size:A4;margin:14mm}
</style></head><body><div class="wrap">
<h1>📖 שלושת הסיפורים — שאלות, תשובות ותרגום</h1>
<div class="lead">הכלל: <b>ממחזרים את השאלה</b> ומוסיפים <b>פיסה אחת מהסיפור</b>. לא צריך לזכור תשובות שלמות — רק מה לקחת מאיפה.</div>
<div class="legend"><span class="leg-q">🔁 טורקיז = נלקח מהשאלה</span><span class="leg-s">📖 כתום = נוסף מהסיפור</span></div>
${sections}
</div></body></html>`;

const out="/Users/shimonkapiloff/Projects/_Studying/08_יידיש/40_סיכומים/3_סיפורים_שאלות_תשובות_תרגום.html";
fs.writeFileSync(out,html);
console.log("wrote",out,"| stories:",ST.length);
