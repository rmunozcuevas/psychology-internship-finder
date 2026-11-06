import { opportunityKind, careerPath } from './eligibility.mjs';
import { assessRole, skillEvidence, resumeFacts } from './resume-fit.mjs';
const isSociology=document.body?.dataset?.discipline==='sociology';
const PROFILE=isSociology?{primaryType:'sociology',rulesUrl:'./sociology-rules.json',feedUrl:'./sociology-opportunities.json',focusedPrefix:'Sociology research, policy & community'}:{primaryType:'psychology',rulesUrl:'./opportunity-rules.json',feedUrl:'./opportunities.json',focusedPrefix:'Clinical, research & HR/I/O'};
const savedStorageKey=isSociology?'fieldnote-saved-sociology':'fieldnote-saved';
let eligibilityRules=null;let programEligibility={};let feedCoverage=null;
let storedSaved=[];try{storedSaved=JSON.parse(localStorage.getItem(savedStorageKey)||'[]')}catch{}
let resumeRequest=0;
let resumeText='',resumeEvidence={},resumeProfile={},resumeAnalysisCache=new Map();
const state={season:'all',path:'all',kind:isSociology?'all':'internship',category:'all',query:'',location:'',remote:false,focus:'all',paid:false,saved:new Set(storedSaved),resumeSkills:new Set(),broadPage:1,page:1,pageSize:20};
const programs=isSociology?[]:[
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
const skillAliases={"research methods":["research","study","participant","method","experiment","literature review"],"data analysis":["data","excel","spss","r studio","python","statistics","statistical"],"child development":["child development","youth development","pediatric","early childhood"],"empathy":["empathy","empathetic","support","care","active listening"],"documentation":["documentation","document","records","notes","writing case"],"teamwork":["teamwork","collaborat","team","cross-functional"],"survey design":["survey","questionnaire","qualtrics","feedback"],"communication":["communication","communicat","presentation","interpersonal"],"outreach":["outreach","community","volunteer","engagement"],"writing":["writing","written","editing","content"],"interviewing":["interview","interviewing","qualitative","focus group"],"neuroscience":["neuroscience","neuropsych","cognitive","brain"]};
if(isSociology){
 delete skillAliases.neuroscience;
 Object.assign(skillAliases,{'policy analysis':['policy','legislation','advocacy','legislative'],'program evaluation':['program evaluation','impact evaluation','outcomes','assessment'],'community outreach':['outreach','community','organizing','engagement'],'research methods':['sociology','social science','qualitative','quantitative','research','methods'],'data analysis':['statistics','statistical','data','excel','spss','stata','python','r studio']});
}
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:'#'}catch{return '#'}};
const postingDateFormatter=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
function postingDates(role){
 const parse=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value))return null;const day=value.slice(0,10),date=new Date(day+'T12:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==day)return null;return {iso:day,label:postingDateFormatter.format(date)}};
 const raw=role.datePosted||role.date_posted||role.posted_at||role.date;
 // Older Greenhouse snapshots stored updated_at as datePosted. Never call that the posting date.
 const legacyGreenhouse=role.source==='Greenhouse'&&!role.dateUpdated;
 return {posted:parse(legacyGreenhouse?null:raw),updated:parse(role.dateUpdated||(legacyGreenhouse?raw:null)),community:role.verification==='community-index'};
}
function roleAssessment(role){if(!resumeText)return null;const key=role.id||role.url;if(!resumeAnalysisCache.has(key))resumeAnalysisCache.set(key,assessRole(role,{text:resumeText,profile:resumeProfile,skills:resumeEvidence}));return resumeAnalysisCache.get(key)}
function roleMatch(role){if(!state.resumeSkills.size)return null;const skills=(role.skills||[]).map(s=>s.toLowerCase());const matched=[...state.resumeSkills].filter(s=>skills.includes(s));return skills.length?Math.round(matched.length/skills.length*100):null}
function allRoles(){return liveRoles.map((r,i)=>{const match=roleMatch(r);return {postingDates:postingDates(r),assessment:roleAssessment(r),checkedAt:r.verification==='community-index'?r.observedAt:(r.lastSeen||r.last_seen_at),verification:r.verification||'employer-api',careerPath:r.careerPath||careerPath(r.title,eligibilityRules),opportunityKind:r.opportunityKind,id:r.id||r.url||'live-'+i,title:r.title,org:r.org,mark:(r.org||'').slice(0,2),logo:r.type===PROFILE.primaryType?'purple':'orange',type:r.type,focus:r.focus||r.careerPath||careerPath(r.title,eligibilityRules),place:r.location||'See source for location',duration:r.season||'Season not specified',pay:r.pay||'See posting',deadline:r.deadline||'See posting',match,skills:r.skills?.length?r.skills:['Skills not specified'],desc:`${r.description||''} · Source: ${r.source||'Employer careers page'}. Catalogue updated ${feedUpdatedAt?new Date(feedUpdatedAt).toLocaleString(): 'recently'}.` ,url:r.url,source:r.source}})}
function filteredRoles(){let rows=allRoles().filter(o=>o.careerPath!=='Broader management / leadership').filter(o=>state.season==='all'||o.duration===state.season).filter(o=>state.path==='all'||o.careerPath===state.path).filter(o=>state.kind==='all'||o.opportunityKind===state.kind).filter(o=>state.category==='all'||o.type===state.category);if(state.query){const q=state.query.toLowerCase();rows=rows.filter(o=>(o.title+' '+o.org+' '+o.focus+' '+o.skills.join(' ')).toLowerCase().includes(q))}if(state.location){const q=state.location.toLowerCase();rows=rows.filter(o=>o.place.toLowerCase().includes(q))}const sort=$('#sort-select')?.value||'recommended';if(sort==='deadline')rows.sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));else if(sort==='match')rows.sort((a,b)=>(b.match??-1)-(a.match??-1));else rows.sort((a,b)=>(a.opportunityKind==='internship'?0:1)-(b.opportunityKind==='internship'?0:1)||(a.duration==='Summer 2027'?0:1)-(b.duration==='Summer 2027'?0:1)||(a.type===PROFILE.primaryType?-1:1)-(b.type===PROFILE.primaryType?-1:1)||String(a.id).localeCompare(String(b.id)));return rows}
function assessmentHTML(result){
 if(!result)return '<a class="eligibility-start" href="#profile">Add your resume to review requirements ↗</a>';
 const groups=[['met','Evidence found'],['gap','Potential gaps'],['unknown','Needs confirmation']];
 return `<details class="eligibility-review"><summary>Resume &amp; requirements review · ${result.requiredGaps?result.requiredGaps+' required-condition gap(s)':result.noRequirements?'Confirm employer requirements':result.unknown+' to confirm'}</summary><p class="review-explainer">Evidence checks, not an eligibility decision or hiring prediction. Only the employer can confirm eligibility. Skills found: keywords, not proof of proficiency.</p>${result.incomplete?'<p class="review-caution">The available description may be incomplete. Compare these checks with the full employer posting.</p>':''}${result.noRequirements?'<p class="review-caution">No explicit mandatory requirements were identified in the available text. This does not mean the role has no requirements.</p>':''}${groups.map(([status,label])=>{const checks=result.checks.filter(c=>c.status===status);return `<section class="review-group review-${status}"><h4>${label} (${checks.length})</h4>${checks.length?checks.map(c=>`<div class="review-check"><strong>${esc(c.area==='skill'?'Listed skill':c.area[0].toUpperCase()+c.area.slice(1))}</strong> <span class="requirement-kind">${esc(c.kind==='skill'?'Skill mention':c.kind==='unspecified'?'Requirement strength unclear':c.kind)}</span><blockquote>${esc(c.requirement)}</blockquote>${c.evidence?`<p>${esc(c.evidence)}</p>`:''}<small>${esc(c.note)}</small></div>`).join(''):'<p>No checks in this group.</p>'}</section>`}).join('')}</details>`;
}
function roleCard(o){return `
      <article class="role-card" data-id="${esc(o.id)}">
        <div class="role-main">
          <div class="org-logo logo-${esc(o.logo)}">${esc(o.mark)}</div>
          <div class="role-info">
            <div class="role-title-row">
              <span class="role-title">${esc(o.title)}</span>
              <span class="category-badge ${o.type === PROFILE.primaryType ? 'psych-badge' : 'adjacent-badge'}">${esc(o.careerPath)}</span>
              ${o.match===null?'':`<span class="match-pill">${o.match}% listed skills found</span>`}
            </div>
            <div class="org-name">${esc(o.org)}${o.verification==='community-index'?' · Community candidate — confirm with employer':''} · ${o.opportunityKind==='internship'?'Internship / student placement':'Entry-level experience'}</div>
            <div class="role-meta">
              <span class="posted-date">Posted: ${o.postingDates.posted?`<time datetime="${esc(o.postingDates.posted.iso)}">${esc(o.postingDates.posted.label)}</time>${o.postingDates.community?' (community-reported)':''}`:'Date not provided'}</span>${o.postingDates.updated?`<span>Updated: <time datetime="${esc(o.postingDates.updated.iso)}">${esc(o.postingDates.updated.label)}</time></span>`:''}<span>⌖ ${esc(o.place)}</span><span>◷ ${esc(o.duration)}</span><span>＄ ${esc(o.pay)}</span><span>◷ Apply by ${esc(o.deadline)}</span>
            </div>
          </div>
        </div>
        <div class="role-bottom">
          <div class="skill-tags"><span class="skill-label">Skills you’ll use</span>${o.skills.map(skill => `<span class="skill-tag ${state.resumeSkills.has(skill.toLowerCase()) ? 'matched' : ''}">${state.resumeSkills.has(skill.toLowerCase()) ? '✦ ' : ''}${esc(skill)}</span>`).join('')}</div>
          <div class="role-actions">
            <button class="save-button ${state.saved.has(String(o.id)) ? 'saved' : ''}" aria-label="${state.saved.has(String(o.id)) ? 'Unsave' : 'Save'} ${esc(o.title)}" title="Save role" type="button">${state.saved.has(String(o.id)) ? '♥' : '♡'}</button>
            <button class="details-button" type="button" aria-expanded="false">Details ▾</button>
            <a class="posting-button" href="${safeUrl(o.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc('Open posting for '+o.title)}">Open posting <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        ${assessmentHTML(o.assessment)}
        <div class="role-description">${esc(o.desc)} <a href="${safeUrl(o.url)}" target="_blank" rel="noopener noreferrer" class="apply-link" data-id="${esc(o.id)}">Visit original job posting ↗</a><br>
          <small>${o.verification==='community-index'?'Community-index candidate: confirm the full qualifications, availability and application status with the employer. ':''}Source: ${esc(o.source || 'Employer careers page')}. Last source observation ${o.checkedAt ? esc(new Date(o.checkedAt).toLocaleString()) : 'not recorded'}. Verify the posting is still open.</small>
        </div>
      </article>`;}
function render() {
  const rows = filteredRoles();
  const pageCount=Math.max(1,Math.ceil(rows.length/state.pageSize));state.page=Math.min(state.page,pageCount);const visibleRows=rows.slice((state.page-1)*state.pageSize,state.page*state.pageSize);
  const sourceSet = liveFeedLoaded;
  const list = $('#role-list');

  if (rows.length) {
    list.innerHTML = visibleRows.map(roleCard).join('');
  } else {
    const hasFilters=Boolean(state.query||state.location||state.category!=='all'||state.path!=='all'||state.season!=='all');
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
  $('#result-count').textContent = liveFeedLoaded ? rows.length : '…';
  $('#showing-count').textContent = liveFeedLoaded ? rows.length : '…';
  $('#pagination').innerHTML=rows.length>state.pageSize?`<div class="pagination-controls"><label>Per page <select id="page-size"><option value="20" ${state.pageSize===20?'selected':''}>20</option><option value="50" ${state.pageSize===50?'selected':''}>50</option><option value="100" ${state.pageSize===100?'selected':''}>100</option></select></label><span>Page ${state.page} of ${pageCount} · ${rows.length} roles</span><div><button type="button" data-page="${Math.max(1,state.page-1)}" ${state.page===1?'disabled':''}>← Previous</button><button type="button" data-page="${Math.min(pageCount,state.page+1)}" ${state.page===pageCount?'disabled':''}>Next →</button></div></div>`:'';
  const catalogue = liveFeedLoaded ? liveRoles : [];
  const internshipCount = catalogue.filter(r => r.opportunityKind === 'internship').length;
  const broadInternships=catalogue.filter(r=>r.opportunityKind==='internship'&&r.careerPath==='Broader management / leadership').length;
  const focusedInternships=internshipCount-broadInternships;
  const communityInternships=catalogue.filter(r=>r.opportunityKind==='internship'&&r.verification==='community-index').length;
  const entryCount = catalogue.filter(r => r.opportunityKind === 'entry-level').length;
  $('#side-count').textContent = liveFeedLoaded ? catalogue.length : '…';
  $('#side-count').title = `${catalogue.length} total listings: ${internshipCount} internships/student placements and ${entryCount} entry-level roles. The list uses your selected filters.`;
  $('#side-count').setAttribute('aria-label', `${catalogue.length} total listings in the catalogue`);
  const viewLabel = state.kind === 'internship' ? 'internships/student placements' : state.kind === 'entry-level' ? 'entry-level experience' : 'internships and entry-level experience';
  $('#catalog-summary').textContent = liveFeedError ? 'Catalogue unavailable. Please try again later.' : !liveFeedLoaded ? 'Loading catalogue totals…' : `${focusedInternships} focused internships · ${broadInternships} broader management internships · ${entryCount} entry-level roles. ${communityInternships} internship candidates need employer review.${feedCoverage ? ` Daily scan: ${feedCoverage.healthy} working sources; ${feedCoverage.failed} unavailable.` : ''}`;
  $('#psych-stat-label').textContent = 'internships across both sections';
  $('#adjacent-stat-label').textContent = 'entry-level experience roles';
  const base = liveFeedLoaded ? liveRoles.filter(r=>r.careerPath!=='Broader management / leadership').filter(r=>state.kind==='all'||r.opportunityKind===state.kind).filter(r=>state.path==='all'||(r.careerPath||careerPath(r.title,eligibilityRules))===state.path).filter(r=>state.season==='all'||r.season===state.season) : [];
  $('#psych-stat').textContent = liveFeedLoaded ? internshipCount : '…';
  $('#adjacent-stat').textContent = liveFeedLoaded ? entryCount : '…';
  $('#saved-count').textContent = state.saved.size;
  $('#saved-stat').textContent = state.saved.size;
  $('#refresh-status').textContent = liveFeedError ? 'Feed unavailable' : sourceSet ? `${feedUpdatedAt && Date.now()-Date.parse(feedUpdatedAt)>36*3600000 ? 'Refresh overdue' : 'Daily feed'} · updated ${feedUpdatedAt ? new Date(feedUpdatedAt).toLocaleDateString() : 'recently'}` : 'Loading live listings…';
  const savedRows=allRoles().filter(r=>state.saved.has(String(r.id)));
  $('#saved').classList.toggle('hidden',location.hash!=='#saved');
  $$('.nav-link').forEach(a=>a.classList.toggle('active',a.hash===(location.hash||'#opportunities')));
  $('#saved-list').innerHTML=savedRows.length?savedRows.map(r=>`<div class="saved-item"><span><b>${esc(r.title)}</b><small>${esc(r.org)}</small></span><button type="button" class="saved-open" data-id="${esc(r.id)}">View role ↗</button></div>`).join(''):'<div class="empty-state">No saved roles yet. Use the heart on a listing to keep it here in this browser.</div>';
  $('#program-list').innerHTML=programs.filter(p=>programEligibility[p.url]?.externalStudentsAllowed===true).filter((p,i,all)=>all.findIndex(other=>other.url===p.url)===i).map(p=>`<article class="program-card"><div><span class="program-type">${esc(p.type)}</span><h3>${esc(p.title)}</h3><b>${esc(p.org)}</b><p>${esc(p.place)} · ${esc(p.date)}</p><small>${esc(p.status)}</small><p><b>External-student eligibility:</b> ${esc(programEligibility[p.url].notes)}</p><small>School access checked ${esc(programEligibility[p.url].verifiedAt)} · <a href="${safeUrl(programEligibility[p.url].evidenceUrl)}" target="_blank" rel="noopener noreferrer">Eligibility source ↗</a></small></div><a href="${safeUrl(p.url)}" target="_blank" rel="noopener noreferrer">Program details ↗</a></article>`).join('');
  $('#feed-notice').textContent=liveFeedError?'Live listings are temporarily unavailable. The Summer 2027 program links below remain available.':`Showing ${rows.length} matches in ${viewLabel}. ${isSociology?'Includes social research, surveys, policy, community services and HR/organizations roles that pass the undergraduate screen.':'Internship totals include clinical support, human services, research, HR and workplace roles that pass the undergraduate screen.'} Use the opportunity selector to change views. Verify eligibility and Summer 2027 availability with the employer.`;
  let broadRows=allRoles().filter(r=>r.opportunityKind==='internship'&&r.careerPath==='Broader management / leadership');
  if(state.query){const q=state.query.toLowerCase();broadRows=broadRows.filter(r=>(r.title+' '+r.org+' '+r.skills.join(' ')).toLowerCase().includes(q));}
  if(state.location)broadRows=broadRows.filter(r=>r.place.toLowerCase().includes(state.location.toLowerCase()));
  if(state.season!=='all')broadRows=broadRows.filter(r=>r.duration===state.season);
  broadRows.sort((a,b)=>(a.duration==='Summer 2027'?0:1)-(b.duration==='Summer 2027'?0:1)||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
  const broadPages=Math.max(1,Math.ceil(broadRows.length/20));state.broadPage=Math.min(state.broadPage,broadPages);
  $('#broader-count').textContent=liveFeedLoaded?broadRows.length:'…';
  $('#broader-nav-count').textContent=liveFeedLoaded?broadInternships:'…';
  $('#focused-heading').textContent=PROFILE.focusedPrefix+(state.kind==='entry-level'?' experience':state.kind==='all'?' opportunities':' internships');
  $('#broader-role-list').innerHTML=broadRows.length?broadRows.slice((state.broadPage-1)*20,state.broadPage*20).map(roleCard).join(''):`<div class="empty-state">${liveFeedLoaded?'No broader management internships match this search.':'Loading broader internships…'}</div>`;
  $('#broader-pagination').innerHTML=broadRows.length>20?`<div class="pagination-controls"><span>Page ${state.broadPage} of ${broadPages} · ${broadRows.length} broader internships</span><div><button type="button" data-broad-page="${Math.max(1,state.broadPage-1)}" ${state.broadPage===1?'disabled':''}>← Previous</button><button type="button" data-broad-page="${Math.min(broadPages,state.broadPage+1)}" ${state.broadPage===broadPages?'disabled':''}>Next →</button></div></div>`:'';
  $('#filter-indicator').classList.remove('visible');
  $$('.chip').forEach(button => {
    button.classList.toggle('active', button.dataset.filter === state.category);
    button.querySelector('span').textContent = button.dataset.filter === 'all' ? base.length : base.filter(o => o.type === button.dataset.filter).length;
  });
}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2500)}
$('#season-filter').addEventListener('change',e=>{state.season=e.target.value;state.page=1;render()});
$('#career-path-filter').addEventListener('change',e=>{state.path=e.target.value;state.page=1;render()});
$('#opportunity-kind').addEventListener('change',e=>{state.kind=e.target.value;state.page=1;render()});
function resetFilters(){state.broadPage=1;state.season='all';$('#season-filter').value='all';state.path='all';$('#career-path-filter').value='all';state.kind=isSociology?'all':'internship';$('#opportunity-kind').value=state.kind;state.category='all';state.query='';state.location='';$('#search-input').value='';$('#location-input').value='';render()}
$('#pagination').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b){state.page=Number(b.dataset.page);render();$('#role-list').scrollIntoView({behavior:'smooth',block:'start'})}});$('#pagination').addEventListener('change',e=>{if(e.target.id==='page-size'){state.pageSize=Number(e.target.value);state.page=1;render()}});
$$('.chip').forEach(b=>b.addEventListener('click',()=>{state.category=b.dataset.filter;state.page=1;render()}));$('#search-input').addEventListener('input',e=>{state.query=e.target.value.trim();render()});$('#location-input').addEventListener('input',e=>{state.location=e.target.value.trim();render()});$('#search-form').addEventListener('submit',e=>{e.preventDefault();state.query=$('#search-input').value.trim();state.location=$('#location-input').value.trim();render();$('#role-list').scrollIntoView({behavior:'smooth',block:'start'})});$('#sort-select').addEventListener('change',render);$('#filter-toggle').addEventListener('click',()=>$('#extra-filters').classList.toggle('hidden'));$('#clear-filters').addEventListener('click',resetFilters);function onRoleCardClick(e){const card=e.target.closest('.role-card');if(!card)return;const id=card.dataset.id;if(e.target.closest('.save-button')){state.saved.has(id)?state.saved.delete(id):state.saved.add(id);localStorage.setItem(savedStorageKey,JSON.stringify([...state.saved]));render()}else if(e.target.closest('.details-button')){const expanded=card.classList.toggle('expanded');e.target.closest('.details-button').setAttribute('aria-expanded',String(expanded))}}
$('#role-list').addEventListener('click',onRoleCardClick);$('#broader-role-list').addEventListener('click',onRoleCardClick);
$('#broader-pagination').addEventListener('click',e=>{const b=e.target.closest('[data-broad-page]');if(b){state.broadPage=Number(b.dataset.broadPage);render();$('#broader-internships').scrollIntoView({behavior:'smooth'})}});
$('#saved-list').addEventListener('click',e=>{const b=e.target.closest('.saved-open');if(!b)return;const broad=allRoles().find(r=>String(r.id)===b.dataset.id)?.careerPath==='Broader management / leadership';resetFilters();location.hash=broad?'#broader-internships':'#opportunities';$(broad?'#broader-internships':'#role-list').scrollIntoView({behavior:'smooth',block:'start'})});$('#show-all-roles').addEventListener('click',()=>{resetFilters();location.hash='#opportunities'});window.addEventListener('hashchange',render);
$$('[data-search]').forEach(link=>link.addEventListener('click',()=>{const query=link.dataset.search;$('#search-input').value=query;state.query=query;state.category='all';render()}));
$('#upload-button').addEventListener('click',()=>$('#resume-input').click());$('#resume-input').addEventListener('change',e=>e.target.files[0]&&processResume(e.target.files[0]));const drop=$('#upload-card');drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragging')});drop.addEventListener('dragleave',()=>drop.classList.remove('dragging'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragging');const f=e.dataTransfer.files[0];if(f)processResume(f)});
const API_BASE=(isSociology?'':window.FIELDNOTE_API_URL||'').replace(/\/$/,'');
Promise.all([PROFILE.rulesUrl,...(isSociology?[]:['./program-eligibility.json'])].map(url=>fetch(url,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Eligibility rules unavailable');return r.json()}))).then(([rules,programRules={}])=>{eligibilityRules=rules;programEligibility=programRules;return fetch(API_BASE?`${API_BASE.replace(/\/$/,'')}/opportunities?limit=2000`:PROFILE.feedUrl,{cache:'no-store'});}).then(r=>{if(!r.ok)throw new Error(`Feed request failed: ${r.status}`);return r.json()}).then(async data=>{
if(API_BASE && Number.isFinite(data.total)){
 const combined=[...(data.roles||[])];
 while(combined.length<data.total){const response=await fetch(`${API_BASE.replace(/\/$/,'')}/opportunities?limit=2000&offset=${combined.length}`,{cache:'no-store'});if(!response.ok)throw Error('Incomplete API feed');const page=await response.json();if(!page.roles?.length)throw Error('Incomplete API feed');combined.push(...page.roles);}
 data.roles=combined;
}
resumeAnalysisCache.clear();liveRoles=(data.roles||[]).map(r=>({...r,opportunityKind:opportunityKind(r.title,r.description||'',eligibilityRules)})).filter(r=>r.opportunityKind);feedUpdatedAt=data.updatedAt||new Date().toISOString();feedCoverage=data.sourceCoverage||null;liveFeedLoaded=true;render()}).catch(()=>{liveFeedLoaded=true;liveFeedError=true;render()});
function clearResume(){
 resumeRequest++;
 resumeText='';resumeEvidence={};resumeProfile={};resumeAnalysisCache.clear();state.resumeSkills=new Set();
 $('#resume-input').value='';$('#resume-profile-form').reset();$('#profile-status').textContent='';$('#resume-review-fields').classList.add('hidden');
 $('#upload-title').textContent='Drop your resume here';$('#upload-sub').textContent='PDF, DOCX or text · up to 10 MB';$('#upload-status').textContent='Resume and profile cleared from this page.';render();
}
$('#clear-resume').addEventListener('click',clearResume);
$('#resume-profile-form').addEventListener('submit',e=>{
 e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;
 resumeProfile=Object.fromEntries(['major','school','enrollment','graduation','gpa','availability','certifications'].map(key=>[key,form.elements.namedItem(key).value.trim()]));
 resumeAnalysisCache.clear();render();$('#profile-status').textContent='Profile applied to each role’s requirements review. Values stay in this page until you clear or reload it.';
});
async function processResume(file){
 const request=++resumeRequest;
 const status=$('#upload-status'),ext=file.name.split('.').pop().toLowerCase();
 if(file.size>10*1024*1024){status.textContent='That file is over 10 MB. Please choose a smaller one.';return}
 if(!['txt','pdf','docx'].includes(ext)){status.textContent='Please use PDF, DOCX or text. Older .doc files are not supported.';return}
 status.textContent='Reading your resume on this device…';let text='';
 try{
  if(ext==='txt')text=await file.text();
  else if(ext==='pdf'){
   if(!window.pdfjsLib)throw Error('The PDF reader is unavailable. Try a text resume.');
   const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
   try{for(let page=1;page<=pdf.numPages;page++){const content=await (await pdf.getPage(page)).getTextContent();text+='\n'+content.items.map(i=>i.str).join(' ');}}finally{await pdf.destroy();}
  }else{
   if(!window.mammoth)throw Error('The DOCX reader is unavailable. Try a text resume.');
   text=(await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value;
  }
  if(!text.trim()||text.replace(/[^a-z]/gi,'').length<30)throw Error('No readable resume text found. Scanned PDFs need a text version or a DOCX file.');
 }catch(error){if(request!==resumeRequest)return;status.textContent=(error.message||'Could not read this file. Try a text resume.')+(resumeText?' Your previous resume is still active.':'');return}
 if(request!==resumeRequest)return;
 resumeText=text;resumeEvidence=skillEvidence(text,skillAliases);state.resumeSkills=new Set(Object.keys(resumeEvidence));resumeProfile={};resumeAnalysisCache.clear();
 const facts=resumeFacts(text),form=$('#resume-profile-form');form.reset();
 for(const key of ['major','gpa'])if(facts[key])form.elements.namedItem(key).value=facts[key].value;
 $('#resume-review-fields').classList.remove('hidden');$('#profile-status').textContent='Review any detected facts and add what the resume cannot establish. Blank fields stay unknown.';
 $('#upload-title').textContent=file.name;$('#upload-sub').textContent=`${(file.size/1024).toFixed(0)} KB · read locally`;
 status.textContent=`${state.resumeSkills.size} skill areas found. Requirements reviews are now available on each role. No qualification or acceptance probability is calculated.`;
 render();
}
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#search-input').focus()}if(e.key==='Escape'){$('#search-input').blur();$('#location-input').blur()}});render();

fetch('./local-programs.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Local program feed unavailable');return r.json()}).then(data=>{
  $('#local-program-list').innerHTML=(data.programs||[]).map(p=>`<article class="program-card"><div><span class="program-type">LOCAL PROGRAM LEAD</span><h3>${esc(p.title)}</h3><b>${esc(p.org)}</b><p>${esc(p.status)}</p><small>${esc(p.eligibility)}</small><p>Page checked ${esc(new Date(p.lastChecked||p.lastAttemptAt).toLocaleDateString())}</p></div><a href="${safeUrl(p.url)}" target="_blank" rel="noopener noreferrer">Check program status ↗</a></article>`).join('');
}).catch(()=>{$('#local-program-list').textContent='Local program checks are unavailable. Please check again later.'});
