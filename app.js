import { opportunityKind, careerPath } from './eligibility.mjs';
let eligibilityRules=null;let programEligibility={};
let storedSaved=[];try{storedSaved=JSON.parse(localStorage.getItem('fieldnote-saved')||'[]')}catch{}
const state={path:'all',kind:'internship',category:'all',query:'',location:'',remote:false,focus:'all',paid:false,saved:new Set(storedSaved),resumeSkills:new Set(),page:1,pageSize:20};
const programs=[
  {title:'Summer Undergraduate Psychology Experience in Research (SUPER)',org:'American Psychological Association',place:'Remote mentorship with a faculty host',status:'2027 applications expected late November or early December 2026 · deadline March 1, 2027',date:'Summer 2027',url:'https://www.apa.org/science/programs/super-fellowship',type:'Psychology research fellowship'},
  {title:'Undergraduate Summer Internship',org:'Pace University Counseling Center',place:'New York, NY',status:'Summer dates posted · application details on program page',date:'May 19 – July 23, 2027',url:'https://www.pace.edu/counseling/psychology-training-programs/undergraduate-summer-internship',type:'Psychology'},
  {title:'Summer Neuroscience Internship Program (SNIP)',org:'University of Florida',place:'Gainesville, FL',status:'Applications open November 12, 2026',date:'May 24 – July 30, 2027',url:'https://neuroscience.ufl.edu/programs/neuroscience-ufl-edu-training-summer-neuroscience-internship-program/',type:'Psychology & neuroscience'},
  {title:'SYNAPSE Neuroscience Internship',org:'Princeton Neuroscience Institute',place:'Princeton, NJ',status:'2027 program dates posted · check application portal for current status',date:'May 31 – July 30, 2027',url:'https://pni.princeton.edu/apply/undergraduate-summer-research-programs/application-process',type:'Research'},
  {title:'Summer Neuroscience Program',org:'Duke Institute for Brain Sciences',place:'Durham, NC',status:'Applications open December 11, 2026',date:'June 7 – July 30, 2027',url:'https://experiences.duke.edu/opportunities/summer-neuroscience-program/',type:'Psychology & neuroscience'},
  {title:'Clinical Research Internship',org:'Rutgers–Princeton Center for Computational Cognitive Neuropsychiatry',place:'New Brunswick, NJ / Princeton, NJ',status:'Summer 2027 applications open January 2027',date:'9 weeks · dates pending',url:'https://ccnp.princeton.edu/trainee-opportunities/',type:'Psychology & clinical research'}
  ,{title:'Psychology Clinic Undergraduate Internship',org:'University of Georgia Psychology Clinic',place:'Athens, GA',status:'Undergraduate clinic experience; course credit and year-long commitment. Summer 2027 start deadline: March 1, 2027.',date:'Summer 2027 start',url:'https://www.psychology.uga.edu/undergraduate-internship',type:'Supervised clinical exposure'}
  ,{title:'Psychology Clinic Undergraduate Summer Internship',org:'Pace University Counseling Center',place:'New York, NY',status:'Undergraduate program with research, outreach, seminars, and supervised clinical exposure. Applications accepted in January.',date:'May 19 – July 23, 2027',url:'https://www.pace.edu/counseling/psychology-training-programs/undergraduate-summer-internship',type:'Supervised clinical exposure'}
  ,{title:'Neuroscience Undergraduate Research Opportunity (NURO)',org:'West Virginia University',place:'Morgantown, WV',status:'Research intensive summer internships; psychology is an eligible background. Check official page for application status.',date:'May 31 – July 30, 2027',url:'https://medicine.wvu.edu/neuroscience/about-us/training-and-internships/neuroscience-undergraduate-research-opportunity-nuro/',type:'Psychology lab / research program'}
  ,{title:'Behavior Science Research Experience for Undergraduates',org:'West Virginia University',place:'Morgantown, WV',status:'NSF-funded undergraduate research program in experimental psychology. Application deadline: February 15, 2027.',date:'Summer 2027',url:'https://psychology.wvu.edu/behavior-science-reu',type:'Psychology lab / research program'}
  ,{title:'Summer Undergraduate Research Program (SURP)',org:'Fred Hutchinson Cancer Center',place:'Seattle, WA',status:'2027 application is live; interdisciplinary clinical, population, and lab research. Check eligibility on program page.',date:'Summer 2027 · 9 weeks',url:'https://www.fredhutch.org/en/education-training/undergraduate-students/summer-undergraduate-research-program.html',type:'Clinical research program'}
  ,{title:'Summer Research Programs / SYNAPSE',org:'Princeton Neuroscience Institute',place:'Princeton, NJ',status:'Applications open; students are matched with research labs. Check current deadline and eligibility.',date:'May 31 – July 30, 2027',url:'https://pni.princeton.edu/apply/undergraduate-summer-interns',type:'Psychology lab / research program'}
];
let liveRoles=[];let feedUpdatedAt=null;let liveFeedLoaded=false;let liveFeedError=false;
const skillAliases={"research methods":["research","study","participant","method","experiment","literature review"],"data analysis":["data","excel","spss","r studio","python","statistics","statistical"],"child development":["child","youth","development","pediatric"],"empathy":["empathy","empathetic","support","care","active listening"],"documentation":["documentation","document","records","notes","writing case"],"teamwork":["teamwork","collaborat","team","cross-functional"],"survey design":["survey","questionnaire","qualtrics","feedback"],"communication":["communication","communicat","presentation","interpersonal"],"outreach":["outreach","community","volunteer","engagement"],"writing":["writing","written","editing","content"],"interviewing":["interview","interviewing","qualitative","focus group"],"neuroscience":["neuroscience","neuropsych","cognitive","brain"]};
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:'#'}catch{return '#'}};
function roleMatch(role){if(!state.resumeSkills.size)return null;const skills=(role.skills||[]).map(s=>s.toLowerCase());const matched=[...state.resumeSkills].filter(s=>skills.includes(s));return Math.round(matched.length/state.resumeSkills.size*100)}
function allRoles(){return liveRoles.map((r,i)=>{const match=roleMatch(r);return {careerPath:r.careerPath||careerPath(r.title,eligibilityRules),opportunityKind:r.opportunityKind,id:r.id||r.url||'live-'+i,title:r.title,org:r.org,mark:(r.org||'').slice(0,2),logo:r.type==='psychology'?'purple':'orange',type:r.type,focus:r.focus||'Research',place:r.location||'See source for location',duration:r.season||'Season not specified',pay:r.pay||'See posting',deadline:r.deadline||'See posting',match,skills:r.skills?.length?r.skills:['Research methods','Communication'],desc:`${r.description||''} · Source: ${r.source||'Employer careers page'}. Last refreshed ${feedUpdatedAt?new Date(feedUpdatedAt).toLocaleString(): 'recently'}.` ,url:r.url,source:r.source}})}
function filteredRoles(){let rows=allRoles().filter(o=>state.path==='all'||o.careerPath===state.path).filter(o=>state.kind==='all'||o.opportunityKind===state.kind).filter(o=>state.category==='all'||o.type===state.category);if(state.query){const q=state.query.toLowerCase();rows=rows.filter(o=>(o.title+' '+o.org+' '+o.focus+' '+o.skills.join(' ')).toLowerCase().includes(q))}if(state.location){const q=state.location.toLowerCase();rows=rows.filter(o=>o.place.toLowerCase().includes(q))}const sort=$('#sort-select')?.value||'recommended';if(sort==='deadline')rows.sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));else if(sort==='match')rows.sort((a,b)=>(b.match??-1)-(a.match??-1));else rows.sort((a,b)=>(a.opportunityKind==='internship'?0:1)-(b.opportunityKind==='internship'?0:1)||(a.duration==='Summer 2027'?0:1)-(b.duration==='Summer 2027'?0:1)||(a.type==='psychology'?-1:1)-(b.type==='psychology'?-1:1)||String(a.id).localeCompare(String(b.id)));return rows}
function render() {
  const rows = filteredRoles();
  const pageCount=Math.max(1,Math.ceil(rows.length/state.pageSize));state.page=Math.min(state.page,pageCount);const visibleRows=rows.slice((state.page-1)*state.pageSize,state.page*state.pageSize);
  const sourceSet = liveFeedLoaded;
  const list = $('#role-list');

  if (rows.length) {
    list.innerHTML = visibleRows.map(o => `
      <article class="role-card" data-id="${esc(o.id)}">
        <div class="role-main">
          <div class="org-logo logo-${esc(o.logo)}">${esc(o.mark)}</div>
          <div class="role-info">
            <div class="role-title-row">
              <span class="role-title">${esc(o.title)}</span>
              <span class="category-badge ${o.type === 'psychology' ? 'psych-badge' : 'adjacent-badge'}">${o.type === 'psychology' ? 'PSYCHOLOGY' : 'ADJACENT'}</span>
              ${o.match===null?'':`<span class="match-pill">${o.match}% skill overlap</span>`}
            </div>
            <div class="org-name">${esc(o.org)} · ${esc(o.careerPath)} · ${o.opportunityKind==='internship'?'Internship / student placement':'Entry-level experience'}</div>
            <div class="role-meta">
              <span>⌖ ${esc(o.place)}</span><span>◷ ${esc(o.duration)}</span><span>＄ ${esc(o.pay)}</span><span>◷ Apply by ${esc(o.deadline)}</span>
            </div>
          </div>
        </div>
        <div class="role-bottom">
          <div class="skill-tags"><span class="skill-label">Skills you’ll use</span>${o.skills.map(skill => `<span class="skill-tag ${state.resumeSkills.has(skill.toLowerCase()) ? 'matched' : ''}">${state.resumeSkills.has(skill.toLowerCase()) ? '✦ ' : ''}${esc(skill)}</span>`).join('')}</div>
          <div class="role-actions">
            <button class="save-button ${state.saved.has(String(o.id)) ? 'saved' : ''}" aria-label="${state.saved.has(String(o.id)) ? 'Unsave' : 'Save'} ${esc(o.title)}" title="Save role" type="button">${state.saved.has(String(o.id)) ? '♥' : '♡'}</button>
            <button class="details-button" type="button">View details ↗</button>
          </div>
        </div>
        <div class="role-description">${esc(o.desc)} <a href="${safeUrl(o.url)}" target="_blank" rel="noopener noreferrer" class="apply-link" data-id="${esc(o.id)}">Visit original job posting ↗</a><br>
          <small>Source: ${esc(o.source || 'Employer careers page')}. Last checked ${feedUpdatedAt ? esc(new Date(feedUpdatedAt).toLocaleString()) : 'during last refresh'}. Verify the posting is still open.</small>
        </div>
      </article>`).join('');
  } else {
    const hasFilters=Boolean(state.query||state.location||state.category!=='all'||state.path!=='all');
    const title = liveFeedError ? 'Listings feed unavailable' : !liveFeedLoaded ? 'Loading live listings…' : hasFilters ? 'No roles match these filters' : 'No live postings in the current feed yet';
    const message = liveFeedError
      ? 'Current listings could not be loaded. Please refresh the page later.'
      : !liveFeedLoaded
        ? 'Checking public employer postings and Summer 2027 programs.'
      : sourceSet
        ? 'The connected public employer boards did not return a match for these filters. Search upcoming programs below or reset filters. New postings are checked daily.'
        : 'Try a broader search or clear a filter to see more opportunities.';
    list.innerHTML = `<div class="empty-state"><strong>${title}</strong>${message}</div>`;
  }

  $('#feed-notice').classList.toggle('hidden', !sourceSet);
  $('#result-count').textContent = rows.length;
  $('#showing-count').textContent = rows.length;
  $('#pagination').innerHTML=rows.length>state.pageSize?`<div class="pagination-controls"><label>Per page <select id="page-size"><option value="20" ${state.pageSize===20?'selected':''}>20</option><option value="50" ${state.pageSize===50?'selected':''}>50</option><option value="100" ${state.pageSize===100?'selected':''}>100</option></select></label><span>Page ${state.page} of ${pageCount} · ${rows.length} roles</span><div><button type="button" data-page="${Math.max(1,state.page-1)}" ${state.page===1?'disabled':''}>← Previous</button><button type="button" data-page="${Math.min(pageCount,state.page+1)}" ${state.page===pageCount?'disabled':''}>Next →</button></div></div>`:'';
  const catalogue = liveFeedLoaded ? liveRoles : [];
  const internshipCount = catalogue.filter(r => r.opportunityKind === 'internship').length;
  const entryCount = catalogue.filter(r => r.opportunityKind === 'entry-level').length;
  $('#side-count').textContent = liveFeedLoaded ? catalogue.length : '…';
  $('#side-count').title = `${catalogue.length} total listings: ${internshipCount} internships/student placements and ${entryCount} entry-level roles. The list uses your selected filters.`;
  $('#side-count').setAttribute('aria-label', `${catalogue.length} total listings in the catalogue`);
  const viewLabel = state.kind === 'internship' ? 'internships/student placements' : state.kind === 'entry-level' ? 'entry-level experience' : 'internships and entry-level experience';
  $('#catalog-summary').textContent = liveFeedError ? 'Catalogue unavailable. Please try again later.' : !liveFeedLoaded ? 'Loading catalogue totals…' : `Full catalogue: ${internshipCount} internships/student placements · ${entryCount} entry-level roles. Viewing ${viewLabel}.`;
  $('#psych-stat-label').textContent = state.kind === 'internship' ? 'psychology internships' : state.kind === 'entry-level' ? 'psychology entry-level roles' : 'psychology roles';
  $('#adjacent-stat-label').textContent = state.kind === 'internship' ? 'adjacent internships' : state.kind === 'entry-level' ? 'adjacent entry-level roles' : 'adjacent roles';
  const base = liveFeedLoaded ? liveRoles.filter(r=>state.kind==='all'||r.opportunityKind===state.kind).filter(r=>state.path==='all'||(r.careerPath||careerPath(r.title,eligibilityRules))===state.path) : [];
  $('#psych-stat').textContent = base.filter(o => o.type === 'psychology').length;
  $('#adjacent-stat').textContent = base.filter(o => o.type === 'adjacent').length;
  $('#saved-count').textContent = state.saved.size;
  $('#saved-stat').textContent = state.saved.size;
  $('#refresh-status').textContent = liveFeedError ? 'Feed unavailable' : sourceSet ? `Daily feed · updated ${feedUpdatedAt ? new Date(feedUpdatedAt).toLocaleDateString() : 'recently'}` : 'Loading live listings…';
  const savedRows=allRoles().filter(r=>state.saved.has(String(r.id)));
  $('#saved').classList.toggle('hidden',location.hash!=='#saved');
  $$('.nav-link').forEach(a=>a.classList.toggle('active',a.hash===(location.hash||'#opportunities')));
  $('#saved-list').innerHTML=savedRows.length?savedRows.map(r=>`<div class="saved-item"><span><b>${esc(r.title)}</b><small>${esc(r.org)}</small></span><button type="button" class="saved-open" data-id="${esc(r.id)}">View role ↗</button></div>`).join(''):'<div class="empty-state">No saved roles yet. Use the heart on a listing to keep it here in this browser.</div>';
  $('#program-list').innerHTML=programs.filter(p=>programEligibility[p.url]?.externalStudentsAllowed===true).filter((p,i,all)=>all.findIndex(other=>other.url===p.url)===i).map(p=>`<article class="program-card"><div><span class="program-type">${esc(p.type)}</span><h3>${esc(p.title)}</h3><b>${esc(p.org)}</b><p>${esc(p.place)} · ${esc(p.date)}</p><small>${esc(p.status)}</small><p><b>External-student eligibility:</b> ${esc(programEligibility[p.url].notes)}</p><small>School access checked ${esc(programEligibility[p.url].verifiedAt)} · <a href="${safeUrl(programEligibility[p.url].evidenceUrl)}" target="_blank" rel="noopener noreferrer">Eligibility source ↗</a></small></div><a href="${safeUrl(p.url)}" target="_blank" rel="noopener noreferrer">Program details ↗</a></article>`).join('');
  $('#feed-notice').textContent=liveFeedError?'Live listings are temporarily unavailable. The Summer 2027 program links below remain available.':`Showing ${rows.length} matches in ${viewLabel}. ${state.kind==='internship' && !base.some(r=>r.type==='psychology') ? 'No direct psychology internships currently pass the screen in the connected employer feed. Adjacent internships are related experience; university program links are listed separately below. ' : ''}Use the opportunity selector to change views. Verify eligibility and Summer 2027 availability with the employer.`;
  $('#filter-indicator').classList.remove('visible');
  $$('.chip').forEach(button => {
    button.classList.toggle('active', button.dataset.filter === state.category);
    button.querySelector('span').textContent = button.dataset.filter === 'all' ? base.length : base.filter(o => o.type === button.dataset.filter).length;
  });
}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2500)}
$('#career-path-filter').addEventListener('change',e=>{state.path=e.target.value;state.page=1;render()});
$('#opportunity-kind').addEventListener('change',e=>{state.kind=e.target.value;state.page=1;render()});
function resetFilters(){state.path='all';$('#career-path-filter').value='all';state.kind='internship';$('#opportunity-kind').value='internship';state.category='all';state.query='';state.location='';$('#search-input').value='';$('#location-input').value='';render()}
$('#pagination').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b){state.page=Number(b.dataset.page);render();$('#role-list').scrollIntoView({behavior:'smooth',block:'start'})}});$('#pagination').addEventListener('change',e=>{if(e.target.id==='page-size'){state.pageSize=Number(e.target.value);state.page=1;render()}});
$$('.chip').forEach(b=>b.addEventListener('click',()=>{state.category=b.dataset.filter;state.page=1;render()}));$('#search-input').addEventListener('input',e=>{state.query=e.target.value.trim();render()});$('#location-input').addEventListener('input',e=>{state.location=e.target.value.trim();render()});$('#search-form').addEventListener('submit',e=>{e.preventDefault();state.query=$('#search-input').value.trim();state.location=$('#location-input').value.trim();render();$('#role-list').scrollIntoView({behavior:'smooth',block:'start'})});$('#sort-select').addEventListener('change',render);$('#filter-toggle').addEventListener('click',()=>$('#extra-filters').classList.toggle('hidden'));$('#clear-filters').addEventListener('click',resetFilters);$('#role-list').addEventListener('click',e=>{const card=e.target.closest('.role-card');if(!card)return;const id=card.dataset.id;if(e.target.closest('.save-button')){state.saved.has(id)?state.saved.delete(id):state.saved.add(id);localStorage.setItem('fieldnote-saved',JSON.stringify([...state.saved]));render()}else if(e.target.closest('.details-button'))card.classList.toggle('expanded')});$('#saved-list').addEventListener('click',e=>{const b=e.target.closest('.saved-open');if(!b)return;resetFilters();location.hash='#opportunities';$('#role-list').scrollIntoView({behavior:'smooth',block:'start'})});$('#show-all-roles').addEventListener('click',()=>{resetFilters();location.hash='#opportunities'});window.addEventListener('hashchange',render);
$$('[data-search]').forEach(link=>link.addEventListener('click',()=>{const query=link.dataset.search;$('#search-input').value=query;state.query=query;state.category='all';render()}));
$('#upload-button').addEventListener('click',()=>$('#resume-input').click());$('#resume-input').addEventListener('change',e=>e.target.files[0]&&processResume(e.target.files[0]));const drop=$('#upload-card');drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragging')});drop.addEventListener('dragleave',()=>drop.classList.remove('dragging'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragging');const f=e.dataTransfer.files[0];if(f)processResume(f)});
const API_BASE=(window.FIELDNOTE_API_URL||'').replace(/\/$/,'');
Promise.all(['./opportunity-rules.json','./program-eligibility.json'].map(url=>fetch(url,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Eligibility rules unavailable');return r.json()}))).then(([rules,programRules])=>{eligibilityRules=rules;programEligibility=programRules;return fetch(API_BASE?`${API_BASE.replace(/\/$/,'')}/opportunities?limit=2000`:'./opportunities.json',{cache:'no-store'});}).then(r=>{if(!r.ok)throw new Error(`Feed request failed: ${r.status}`);return r.json()}).then(data=>{liveRoles=(data.roles||[]).map(r=>({...r,opportunityKind:opportunityKind(r.title,r.description||'',eligibilityRules)})).filter(r=>r.opportunityKind);feedUpdatedAt=data.updatedAt||new Date().toISOString();liveFeedLoaded=true;render()}).catch(()=>{liveFeedLoaded=true;liveFeedError=true;render()});
async function processResume(file){if(file.size>10*1024*1024){$('#upload-status').textContent='That file is over 10 MB. Please choose a smaller one.';return}$('#upload-title').textContent=file.name;$('#upload-sub').textContent='Reading your skills on this device…';$('#upload-status').textContent='';let text='';try{if(file.type==='text/plain'||file.name.endsWith('.txt'))text=await file.text();else if(file.type==='application/pdf'||file.name.endsWith('.pdf')){if(window.pdfjsLib){const data=new Uint8Array(await file.arrayBuffer());const pdf=await pdfjsLib.getDocument({data}).promise;for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p);const content=await page.getTextContent();text+=' '+content.items.map(i=>i.str).join(' ')}}else text=await file.text()}else if(file.name.endsWith('.docx')){if(window.mammoth){const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});text=result.value}else text=await file.text()}else text=await file.text()}catch(err){text=''}if(!text.trim()){const ext=file.name.split('.').pop().toUpperCase();$('#upload-sub').textContent=`${ext} selected`;$('#upload-status').textContent='Preview parser unavailable for this format here. Try a .txt resume for skill matching.';return}const normalized=text.toLowerCase();state.resumeSkills=new Set(Object.entries(skillAliases).filter(([skill,words])=>words.some(word=>normalized.includes(word))).map(([skill])=>skill.toLowerCase()));render();$('#upload-sub').textContent=`${(file.size/1024).toFixed(0)} KB · analyzed locally`;$('#upload-status').textContent=state.resumeSkills.size?`${state.resumeSkills.size} skill areas highlighted in matching roles`:'Resume ready. Add details with a text resume for a richer match.';toast(state.resumeSkills.size?`Highlighted ${state.resumeSkills.size} skill areas from the resume.`:'Resume added. No skill keywords found yet.')}
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#search-input').focus()}if(e.key==='Escape'){$('#search-input').blur();$('#location-input').blur()}});render();
