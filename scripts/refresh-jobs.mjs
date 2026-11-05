import { readFile, writeFile } from 'node:fs/promises';

// Load local .env values for manual runs without adding a runtime dependency.
try {
  const envText = await readFile(new URL('../.env', import.meta.url), 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] in process.env) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch {}

const OUT = new URL('../opportunities.json', import.meta.url);
const TERMS = /(intern|internship|summer student|research assistant|co-?op|fellow)/i;
const SUMMER = /(summer\s*(?:'|’)?\s*2027|2027\s+summer|summer student)/i;
const PSYCH = /(psycholog|behavioral health|mental health|neuropsych|counseling|human behavior|child development)/i;
const ADJACENT = /(research|community|people analytics|user research|learning|program assistant|public health)/i;
const SKILLS = ['Research methods','Data analysis','Child development','Empathy','Documentation','Teamwork','Survey design','Communication','Outreach','Writing','Interviewing','Neuroscience'];
const SOURCES = [
  {name:'Greenhouse public career boards', url:'https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true', kind:'greenhouse'},
  {name:'Lever public postings', url:'https://api.lever.co/v0/postings/{site}?mode=json', kind:'lever'},
  {name:'Ashby public job boards', url:'https://api.ashbyhq.com/posting-api/job-board/{board}', kind:'ashby'}
];
const boards = (process.env.GREENHOUSE_BOARDS || '').split(',').map(s=>s.trim()).filter(Boolean);
const leverSites = (process.env.LEVER_SITES || '').split(',').map(s=>s.trim()).filter(Boolean);
const ashbyBoards = (process.env.ASHBY_BOARDS || '').split(',').map(s=>s.trim()).filter(Boolean);
const old = JSON.parse(await readFile(OUT, 'utf8').catch(()=>'{"roles":[]}'));
const roles = [];
const errors = [];
async function get(url, opts={}) { const res=await fetch(url,{...opts,signal:AbortSignal.timeout(18000),headers:{'user-agent':'FieldnoteInternshipFinder/1.0 contact=project-maintainer',...opts.headers}});if(!res.ok)throw new Error(`${res.status} ${url}`);return res.json(); }
function classify(title, text) { const t=title.trim();const v=`${t} ${text}`;if(!TERMS.test(t)||/talent community|expression of interest/i.test(t))return null;if(!SUMMER.test(t)&&!SUMMER.test(text))return null;if(PSYCH.test(v))return 'psychology';if(ADJACENT.test(v))return 'adjacent';return null; }
function skills(text){const s=text.toLowerCase();return SKILLS.filter(k=>s.includes(k.toLowerCase())||({ 'Data analysis':['spss','statistics','excel','r studio'],'Research methods':['qualitative','quantitative','participant'],'Empathy':['client support','patient care'],'Survey design':['qualtrics','questionnaire'],'Child development':['pediatric','youth']}[k]||[]).some(x=>s.includes(x)));}
function add({title,company,location='',url='',description='',date='',source=''}) { const type=classify(title,`${description} ${date}`);if(!type||!url)return;const key=url.split('?')[0];if(roles.some(r=>r.url.split('?')[0]===key))return;roles.push({id:key,title,org:company,location,type,source,url,description:description.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,1800),skills:skills(`${title} ${description}`),firstSeen:new Date().toISOString().slice(0,10),datePosted:date||null,season:'Summer 2027'}); }
for (const token of boards) try { const data=await get(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`);for(const j of data.jobs||[])add({title:j.title,company:j.company_name||token,location:j.location?.name||'',url:j.absolute_url,description:j.content||'',date:j.updated_at||j.first_published,source:'Greenhouse'}); } catch(e) {errors.push(`Greenhouse ${token}: ${e.message}`)}
for (const site of leverSites) try { const data=await get(`https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`);for(const j of data||[])add({title:j.text,company:j.categories?.team||site,location:j.categories?.location||'',url:j.hostedUrl,description:j.descriptionPlain||j.description||'',date:j.createdAt?new Date(j.createdAt).toISOString():null,source:'Lever'}); } catch(e) {errors.push(`Lever ${site}: ${e.message}`)}
for (const board of ashbyBoards) try { const data=await get(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}`);for(const j of data.jobs||[])add({title:j.title,company:board,location:j.location||'',url:j.jobUrl,description:j.descriptionPlain||j.descriptionHtml||'',date:j.publishedAt,source:'Ashby'}); } catch(e) {errors.push(`Ashby ${board}: ${e.message}`)}
const retained=(old.roles||[]).filter(oldRole=>classify(oldRole.title,oldRole.description)&&!roles.some(r=>r.url===oldRole.url));
const merged=[...roles,...retained].sort((a,b)=>(a.type==='psychology'?-1:1)-(b.type==='psychology'?-1:1)||a.title.localeCompare(b.title));
await writeFile(OUT,JSON.stringify({updatedAt:new Date().toISOString(),source:'Approved public career-board APIs',total:merged.length,refreshed:roles.length,roles:merged,errors},null,2)+'\n');
console.log(`Refresh complete: ${roles.length} fresh Summer 2027 roles, ${merged.length} retained total, ${errors.length} source errors.`);
if(!boards.length&&!leverSites.length&&!ashbyBoards.length)console.log('No source configuration found. Set GREENHOUSE_BOARDS, LEVER_SITES, and/or ASHBY_BOARDS.');
