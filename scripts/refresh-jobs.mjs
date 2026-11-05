import { readFile, writeFile } from 'node:fs/promises';

const OUT = new URL('../opportunities.json', import.meta.url);
const TERMS = /(intern|internship|summer student|research assistant|co-?op|fellow)/i;
const PSYCH = /(psycholog|behavioral health|mental health|neuropsych|counseling|human behavior|child development)/i;
const ADJACENT_TITLE = /(research assistant|research intern|social science|consumer insights|ux research|user research|people analytics|human resources|clinical research|health economics|health outcomes|medical writing|community|social impact|human factors|public health)/i;
const ADJACENT_CONTEXT = /(behavioral science|organizational psychology|human factors|consumer behavior|consumer research|public health|social impact|health economics|health outcomes)/i;
const OUT_OF_SCOPE = /(engineer|engineering|software|technology|technical|\bIT\b|machine learning|market design|business operations|marketing|ecommerce|product development|test kitchen|industrial design|environmental health\s*(?:&|and)\s*safety)/i;
const NOT_INTERN = /(senior|director|manager|vice president|physician|therapist|licensed|postdoctoral|postdoc|professor|faculty|phd candidate)/i;
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
function classify(title, text) { const t=title.trim();const v=`${t} ${text}`;if(!TERMS.test(t)||NOT_INTERN.test(t)||OUT_OF_SCOPE.test(t)||/talent community|expression of interest|\bopportunities\s*$/i.test(t))return null;if(PSYCH.test(v))return 'psychology';if(ADJACENT_TITLE.test(t)||ADJACENT_CONTEXT.test(text))return 'adjacent';return null; }
function skills(text){const s=text.toLowerCase();return SKILLS.filter(k=>s.includes(k.toLowerCase())||({ 'Data analysis':['spss','statistics','excel','r studio'],'Research methods':['qualitative','quantitative','participant'],'Empathy':['client support','patient care'],'Survey design':['qualtrics','questionnaire'],'Child development':['pediatric','youth']}[k]||[]).some(x=>s.includes(x)));}
function add({title,company,location='',url='',description='',date='',source=''}) { const type=classify(title,`${description} ${date}`);if(!type||!url)return;const key=url.split('?')[0];if(roles.some(r=>r.url.split('?')[0]===key))return;const text=`${title} ${description}`;const summer2027=/(summer\s*(?:'|’)?\s*2027|2027\s+summer|summer\s+student)/i.test(text);const spring2027=/spring\s*(?:'|’)?\s*2027/i.test(text);roles.push({id:key,title,org:company,location,type,source,url,description:description.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,1800),skills:skills(`${title} ${description}`),firstSeen:new Date().toISOString().slice(0,10),datePosted:date||null,season:summer2027?'Summer 2027':spring2027?'Spring 2027':'Season not specified'}); }
for (const token of boards) try { const data=await get(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`);for(const j of data.jobs||[])add({title:j.title,company:j.company_name||token,location:j.location?.name||'',url:j.absolute_url,description:j.content||'',date:j.updated_at||j.first_published,source:'Greenhouse'}); } catch(e) {errors.push(`Greenhouse ${token}: ${e.message}`)}
for (const site of leverSites) try { const data=await get(`https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`);for(const j of data||[])add({title:j.text,company:j.categories?.team||site,location:j.categories?.location||'',url:j.hostedUrl,description:j.descriptionPlain||j.description||'',date:j.createdAt?new Date(j.createdAt).toISOString():null,source:'Lever'}); } catch(e) {errors.push(`Lever ${site}: ${e.message}`)}
for (const board of ashbyBoards) try { const data=await get(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}`);for(const j of data.jobs||[])add({title:j.title,company:board,location:j.location||'',url:j.jobUrl,description:j.descriptionPlain||j.descriptionHtml||'',date:j.publishedAt,source:'Ashby'}); } catch(e) {errors.push(`Ashby ${board}: ${e.message}`)}
const retained=(old.roles||[]).filter(oldRole=>classify(oldRole.title,oldRole.description)&&!roles.some(r=>r.url.split('?')[0]===oldRole.url.split('?')[0]));
const merged=[...roles,...retained].sort((a,b)=>(a.type==='psychology'?-1:1)-(b.type==='psychology'?-1:1)||a.title.localeCompare(b.title));
await writeFile(OUT,JSON.stringify({updatedAt:new Date().toISOString(),source:'Approved public career-board APIs',total:merged.length,refreshed:roles.length,roles:merged,errors},null,2)+'\n');
console.log(`Refresh complete: ${roles.length} fresh relevant roles, ${merged.length} total, ${errors.length} source errors.`);
if(!boards.length&&!leverSites.length&&!ashbyBoards.length)console.log('No source configuration found. Set GREENHOUSE_BOARDS, LEVER_SITES, and/or ASHBY_BOARDS.');
