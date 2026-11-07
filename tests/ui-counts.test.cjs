const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const dependencies=Promise.all([import('../listing-quality.mjs'),import('../student-tools.mjs')]).then(values=>Object.assign({},...values));

test('live counts, sections, pagination and season filters reflect the collected snapshot',async()=>{
 const elements=new Map();
 function element(id){if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',dataset:{},classList:{toggle(){},remove(){},add(){}},setAttribute(){},addEventListener(){},querySelector(){return element(id+' span')},scrollIntoView(){}});return elements.get(id)}
 const context={...await dependencies,console,localStorage:{getItem(){return null}},document:{querySelector:element,querySelectorAll(){return []},addEventListener(){}},location:{hash:''},window:{addEventListener(){},FIELDNOTE_API_URL:''},fetch(){return new Promise(()=>{})},setTimeout,clearTimeout};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync('app.js','utf8').replace(/^import .*\n/gm,''),context);
 const data=JSON.parse(fs.readFileSync('opportunities.json'));
 const active=data.roles.filter(r=>context.listingStatus(r).state!=='closed');
 const internship=active.filter(r=>r.opportunityKind==='internship');
 const focused=internship.filter(r=>r.careerPath!=='Broader management / leadership');
 const broad=internship.filter(r=>r.careerPath==='Broader management / leadership');
 context.sampleRoles=data.roles;
 vm.runInContext('liveRoles=sampleRoles;liveFeedLoaded=true;render()',context);
 assert.equal(Number(element('#side-count').textContent),data.roles.filter(r=>context.listingStatus(r).state!=='closed').length);
 assert.equal(Number(element('#psych-stat').textContent),internship.length);
 assert.equal(Number(element('#result-count').textContent),focused.length);
 assert.equal(Number(element('#broader-count').textContent),broad.length);
 assert.equal((element('#role-list').innerHTML.match(/<article class="role-card"/g)||[]).length,Math.min(20,focused.length));
 assert.equal((element('#broader-role-list').innerHTML.match(/<article class="role-card"/g)||[]).length,Math.min(20,broad.length));
 vm.runInContext("state.season='Summer 2027';render()",context);
 assert.equal(Number(element('#result-count').textContent),focused.filter(r=>r.season==='Summer 2027').length);
 assert.equal(Number(element('#broader-count').textContent),broad.filter(r=>r.season==='Summer 2027').length);
 vm.runInContext("state.query='nonexistent-role-query-xyz';render()",context);
 assert.equal(Number(element('#result-count').textContent),0);
 assert.equal(Number(element('#broader-count').textContent),0);
 assert.equal(Number(element('#psych-stat').textContent),internship.length);
});

test('sociology uses its own snapshot, filters, counts and saved storage',async()=>{
 const elements=new Map(),keys=[];
 function element(id){if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',dataset:{},classList:{toggle(){},remove(){},add(){}},setAttribute(){},addEventListener(){},querySelector(){return element(id+' span')},scrollIntoView(){}});return elements.get(id)}
 const context={...await dependencies,console,localStorage:{getItem(key){keys.push(key);return null}},document:{body:{dataset:{discipline:'sociology'}},querySelector:element,querySelectorAll(){return []},addEventListener(){}},location:{hash:''},window:{addEventListener(){}},fetch(){return new Promise(()=>{})},setTimeout,clearTimeout};
 vm.createContext(context);vm.runInContext(fs.readFileSync('app.js','utf8').replace(/^import .*\n/gm,''),context);
 const data=JSON.parse(fs.readFileSync('sociology-opportunities.json'));context.sampleRoles=data.roles;
 vm.runInContext('liveRoles=sampleRoles;liveFeedLoaded=true;render()',context);
 assert.ok(keys.includes('fieldnote-saved-sociology'));
 assert.equal(Number(element('#side-count').textContent),data.roles.filter(r=>context.listingStatus(r).state!=='closed').length);
 assert.equal(Number(element('#result-count').textContent),data.roles.filter(r=>r.careerPath!=='Broader management / leadership'&&context.listingStatus(r).state!=='closed').length);
 vm.runInContext("state.path='Social research & evaluation';render()",context);
 assert.equal(Number(element('#result-count').textContent),data.roles.filter(r=>r.careerPath==='Social research & evaluation'&&context.listingStatus(r).state!=='closed').length);
 assert.equal(vm.runInContext('PROFILE.feedUrl',context),'./sociology-opportunities.json');
});

test('resume upload, confirmed profile, reviews and clear work in both directories',async()=>{
 const engine=await import('../resume-fit.mjs');
 for(const discipline of ['psychology','sociology']){
  const elements=new Map(),handlers=new Map();
  const fields=Object.fromEntries(['major','school','enrollment','graduation','gpa','availability','certifications'].map(key=>[key,{value:''}]));
  const element=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',dataset:{},classList:{toggle(){},remove(){},add(){}},setAttribute(){},addEventListener(name,handler){handlers.set(id+':'+name,handler)},querySelector(){return element(id+' span')},scrollIntoView(){},reset(){Object.values(fields).forEach(f=>f.value='')},elements:{namedItem(key){return fields[key]}},reportValidity(){return true}});return elements.get(id)};
  const context={...await dependencies,...engine,console,localStorage:{getItem(){return null},setItem(){throw Error('Resume must not be persisted')}},document:{body:{dataset:{discipline}},querySelector:element,querySelectorAll(){return []},addEventListener(){}},location:{hash:''},window:{addEventListener(){}},fetch(){return new Promise(()=>{})},setTimeout,clearTimeout};
  vm.createContext(context);vm.runInContext(fs.readFileSync('app.js','utf8').replace(/^import .*\n/gm,''),context);
  context.roles=[{id:'example',title:'Research Intern',org:'Example',description:'Minimum GPA of 3.5 required. Research experience preferred.',type:discipline,careerPath:'Related experience',opportunityKind:'internship',skills:['Research methods'],url:'https://example.org/job'}];
  vm.runInContext('liveRoles=roles;liveFeedLoaded=true;',context);
  context.file={name:'resume.txt',size:100,text:async()=> 'Bachelor of Arts in Psychology. GPA: 3.2/4.0. Research assistant at student lab.'};
  await vm.runInContext('processResume(file)',context);
  assert.match(element('#role-list').innerHTML,/Resume &amp; requirements review/);
  assert.match(element('#role-list').innerHTML,/Needs confirmation/);
  assert.equal(vm.runInContext('allRoles()[0].assessment.requiredGaps',context),0);
  assert.equal(fields.gpa.value,'3.2');
  handlers.get('#resume-profile-form:submit')({preventDefault(){},currentTarget:element('#resume-profile-form')});
  assert.equal(vm.runInContext('allRoles()[0].assessment.requiredGaps',context),1);
  assert.match(element('#role-list').innerHTML,/Your confirmed profile: gpa/);
  context.file={name:'old.doc',size:100};await vm.runInContext('processResume(file)',context);
  assert.match(element('#upload-status').textContent,/not supported/);
  vm.runInContext('clearResume()',context);
  assert.equal(vm.runInContext('resumeText',context),'');
  assert.equal(vm.runInContext('allRoles()[0].assessment',context),null);
  assert.doesNotMatch(element('#role-list').innerHTML,/3\.2/);
 }
});

test('posting dates use source dates, preserve calendar day and never substitute first-seen dates',async()=>{
 const element=()=>({value:'',textContent:'',innerHTML:'',dataset:{},classList:{toggle(){},remove(){},add(){}},setAttribute(){},addEventListener(){},querySelector:element});
 const context={...await dependencies,console,localStorage:{getItem(){return null}},document:{querySelector:element,querySelectorAll(){return []},addEventListener(){}},location:{hash:''},window:{addEventListener(){}},fetch(){return new Promise(()=>{})},setTimeout,clearTimeout};
 vm.createContext(context);vm.runInContext(fs.readFileSync('app.js','utf8').replace(/^import .*\n/gm,''),context);
 const dates=role=>{context.dateRole=role;return vm.runInContext('postingDates(dateRole)',context)};
 assert.equal(dates({datePosted:'2026-11-01T00:00:00Z',source:'Workday'}).posted.label,'Nov 1, 2026');
 assert.equal(dates({date:'2026-10-20',verification:'community-index'}).posted.iso,'2026-10-20');
 assert.equal(dates({datePosted:'2026-11-01',source:'Greenhouse'}).posted,null);
 assert.equal(dates({datePosted:'2026-11-01',source:'Greenhouse'}).updated.iso,'2026-11-01');
 assert.equal(dates({dateUpdated:'2026-11-01',source:'Greenhouse'}).posted,null);
 assert.equal(dates({datePosted:'2026-02-30'}).posted,null);
 assert.equal(dates({firstSeen:'2026-11-01',lastSeen:'2026-11-02'}).posted,null);
});

test('preferences, advanced filters, shared tracker and new-listing inbox work together',async()=>{
 const elements=new Map(),handlers=new Map(),storage=new Map();
 const selected=[{value:'Research / human behavior',checked:true}];
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:false,textContent:'',innerHTML:'',dataset:{},classList:{toggle(){},remove(){},add(){},contains(){return false}},setAttribute(){},addEventListener(name,handler){handlers.set(id+':'+name,handler)},querySelector(){return element(id+' span')},scrollIntoView(){}});return elements.get(id)};
 const context={...await dependencies,console,localStorage:{getItem(key){return storage.get(key)||null},setItem(key,value){storage.set(key,value)}},document:{body:{dataset:{}},querySelector:element,querySelectorAll(selector){return selector.includes('preferred-path')?selected:[]},addEventListener(){}},location:{hash:''},window:{addEventListener(){}},fetch(){return new Promise(()=>{})},setTimeout,clearTimeout};
 vm.createContext(context);vm.runInContext(fs.readFileSync('app.js','utf8').replace(/^import .*\n/gm,''),context);
 context.roles=[{id:'a',title:'Community Intern',org:'Example',location:'Boston, MA',type:'psychology',careerPath:'Clinical / pre-therapy',opportunityKind:'internship',skills:[],url:'https://example.org/a',lastSeen:new Date().toISOString()},{id:'b',title:'Survey Research Intern',org:'Example',location:'Charlotte, NC',type:'psychology',careerPath:'Research / human behavior',opportunityKind:'internship',skills:[],url:'https://example.org/b',lastSeen:new Date().toISOString()},{id:'c',title:'Management Intern',org:'Example',location:'Raleigh, NC',type:'broader',careerPath:'Broader management / leadership',opportunityKind:'internship',skills:[],url:'https://example.org/c',lastSeen:new Date().toISOString()}];
 vm.runInContext('liveRoles=roles;liveFeedLoaded=true;initializeAlertBaseline();render()',context);
 assert.equal(Number(element('#alert-count').textContent),0);
 element('#pref-location').value='Charlotte';element('#pref-mode').value='all';
 handlers.get('#preferences-form:submit')({preventDefault(){}});
 assert.equal(vm.runInContext('filteredRoles()[0].id',context),'b');
 assert.ok(storage.has('ninerpath-preferences-psychology'));
 handlers.get('#region-filter:change')({target:{value:'NC'}});
 assert.equal(Number(element('#result-count').textContent),1);assert.equal(Number(element('#broader-count').textContent),1);
 const card={dataset:{id:'b'}},target={closest(selector){return selector==='.role-card'?card:selector==='.track-button'?{}:null}};
 handlers.get('#role-list:click')({target});
 assert.equal(Number(element('#tracker-count').textContent),1);assert.equal(context.location.hash,'#tracker');
 assert.match(storage.get('ninerpath-applications-v1'),/Survey Research Intern/);
 const appCard={dataset:{applicationId:'b'},querySelectorAll(){return [{dataset:{appField:'status'},value:'Applied'},{dataset:{appField:'notes'},value:'Submitted application'},{dataset:{appField:'nextAction'},value:'2026-12-01'}]}};
 handlers.get('#tracker-list:click')({target:{closest(selector){return selector==='[data-application-id]'?appCard:selector==='[data-save-application]'?{}:null}}});
 assert.equal(JSON.parse(storage.get('ninerpath-applications-v1')).b.status,'Applied');
 context.newRole={...context.roles[1],id:'new',url:'https://example.org/new'};
 vm.runInContext('liveRoles.push(newRole);render()',context);assert.equal(Number(element('#alert-count').textContent),1);
 handlers.get('#read-alerts:click')();assert.equal(Number(element('#alert-count').textContent),0);
 assert.equal(JSON.parse(storage.get('ninerpath-applications-v1')).b.notes,'Submitted application');
 assert.ok([...storage.values()].every(value=>!value.includes('resumeText')));
});
