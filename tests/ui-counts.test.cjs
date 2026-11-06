const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');

test('live counts, sections, pagination and season filters reflect the collected snapshot',()=>{
 const elements=new Map();
 function element(id){if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',dataset:{},classList:{toggle(){},remove(){},add(){}},setAttribute(){},addEventListener(){},querySelector(){return element(id+' span')},scrollIntoView(){}});return elements.get(id)}
 const context={console,localStorage:{getItem(){return null}},document:{querySelector:element,querySelectorAll(){return []},addEventListener(){}},location:{hash:''},window:{addEventListener(){},FIELDNOTE_API_URL:''},fetch(){return new Promise(()=>{})},setTimeout,clearTimeout};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync('app.js','utf8').replace(/^import .*\n/,''),context);
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
 vm.createContext(context);vm.runInContext(fs.readFileSync('app.js','utf8').replace(/^import .*\n/,''),context);
 const data=JSON.parse(fs.readFileSync('sociology-opportunities.json'));context.sampleRoles=data.roles;
 vm.runInContext('liveRoles=sampleRoles;liveFeedLoaded=true;render()',context);
 assert.ok(keys.includes('fieldnote-saved-sociology'));
 assert.equal(Number(element('#side-count').textContent),data.roles.length);
 assert.equal(Number(element('#result-count').textContent),data.roles.filter(r=>r.careerPath!=='Broader management / leadership').length);
 vm.runInContext("state.path='Social research & evaluation';render()",context);
 assert.equal(Number(element('#result-count').textContent),data.roles.filter(r=>r.careerPath==='Social research & evaluation').length);
 assert.equal(vm.runInContext('PROFILE.feedUrl',context),'./sociology-opportunities.json');
});
