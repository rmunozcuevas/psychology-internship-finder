const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');

test('live counts, sections, pagination and season filters reflect the collected snapshot',()=>{
 const elements=new Map();
 function element(id){if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',dataset:{},classList:{toggle(){},remove(){},add(){}},setAttribute(){},addEventListener(){},querySelector(){return element(id+' span')},scrollIntoView(){}});return elements.get(id)}
 const context={console,localStorage:{getItem(){return null}},document:{querySelector:element,querySelectorAll(){return []},addEventListener(){}},location:{hash:''},window:{addEventListener(){},FIELDNOTE_API_URL:''},fetch(){return new Promise(()=>{})},setTimeout,clearTimeout};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync('app.js','utf8').replace(/^import .*\n/gm,''),context);
 const data=JSON.parse(fs.readFileSync('opportunities.json'));
 const internship=data.roles.filter(r=>r.opportunityKind==='internship');
 const focused=internship.filter(r=>r.careerPath!=='Broader management / leadership');
 const broad=internship.filter(r=>r.careerPath==='Broader management / leadership');
 context.sampleRoles=data.roles;
 vm.runInContext('liveRoles=sampleRoles;liveFeedLoaded=true;render()',context);
 assert.equal(Number(element('#side-count').textContent),data.roles.length);
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

test('sociology uses its own snapshot, filters, counts and saved storage',()=>{
 const elements=new Map(),keys=[];
 function element(id){if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',dataset:{},classList:{toggle(){},remove(){},add(){}},setAttribute(){},addEventListener(){},querySelector(){return element(id+' span')},scrollIntoView(){}});return elements.get(id)}
 const context={console,localStorage:{getItem(key){keys.push(key);return null}},document:{body:{dataset:{discipline:'sociology'}},querySelector:element,querySelectorAll(){return []},addEventListener(){}},location:{hash:''},window:{addEventListener(){}},fetch(){return new Promise(()=>{})},setTimeout,clearTimeout};
 vm.createContext(context);vm.runInContext(fs.readFileSync('app.js','utf8').replace(/^import .*\n/gm,''),context);
 const data=JSON.parse(fs.readFileSync('sociology-opportunities.json'));context.sampleRoles=data.roles;
 vm.runInContext('liveRoles=sampleRoles;liveFeedLoaded=true;render()',context);
 assert.ok(keys.includes('fieldnote-saved-sociology'));
 assert.equal(Number(element('#side-count').textContent),data.roles.length);
 assert.equal(Number(element('#result-count').textContent),data.roles.filter(r=>r.careerPath!=='Broader management / leadership').length);
 vm.runInContext("state.path='Social research & evaluation';render()",context);
 assert.equal(Number(element('#result-count').textContent),data.roles.filter(r=>r.careerPath==='Social research & evaluation').length);
 assert.equal(vm.runInContext('PROFILE.feedUrl',context),'./sociology-opportunities.json');
});

test('resume upload, confirmed profile, reviews and clear work in both directories',async()=>{
 const engine=await import('../resume-fit.mjs');
 for(const discipline of ['psychology','sociology']){
  const elements=new Map(),handlers=new Map();
  const fields=Object.fromEntries(['major','school','enrollment','graduation','gpa','availability','certifications'].map(key=>[key,{value:''}]));
  const element=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',dataset:{},classList:{toggle(){},remove(){},add(){}},setAttribute(){},addEventListener(name,handler){handlers.set(id+':'+name,handler)},querySelector(){return element(id+' span')},scrollIntoView(){},reset(){Object.values(fields).forEach(f=>f.value='')},elements:{namedItem(key){return fields[key]}},reportValidity(){return true}});return elements.get(id)};
  const context={...engine,console,localStorage:{getItem(){return null},setItem(){throw Error('Resume must not be persisted')}},document:{body:{dataset:{discipline}},querySelector:element,querySelectorAll(){return []},addEventListener(){}},location:{hash:''},window:{addEventListener(){}},fetch(){return new Promise(()=>{})},setTimeout,clearTimeout};
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
