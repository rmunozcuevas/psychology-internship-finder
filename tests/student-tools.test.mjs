import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesAdvanced,matchesQuery,matchesState,workMode,payType,relevance,trackerCSV,updateApplication,alertCandidates} from '../student-tools.mjs';
import {listingStatus,deadlineTime,studentEligibilityNotes} from '../listing-quality.mjs';
import {inspectPosting,publicPostingUrl,publicAddress,verifyFeeds} from '../scripts/verify-listings.mjs';
import {opportunityKind} from '../eligibility.mjs';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const now=Date.parse('2026-11-06T17:00:00Z');
const role={id:'r1',title:'Survey Research Intern',org:'Example',description:'Analyze surveys using SPSS.',skills:['Research methods'],careerPath:'Research / human behavior',opportunityKind:'internship',season:'Summer 2027',location:'Charlotte, NC',url:'https://example.org/jobs/1',lastSeen:'2026-11-06T12:00:00Z',deadline:'2026-11-10'};
test('search combines phrases and exclusions, states, work modes, pay and posting ages',()=>{
 assert.ok(matchesQuery('Community research assistant SPSS','“research assistant” SPSS -senior'));
 assert.ok(!matchesQuery('Senior research assistant','research -senior'));
 assert.ok(!matchesQuery('Research assistant','research policy'));
 assert.ok(matchesState('Charlotte, NC','NC'));assert.ok(matchesState('Raleigh, North Carolina','NC'));assert.ok(!matchesState('Remote or Charlotte','OR'));
 assert.equal(workMode({...role,location:'Remote - US'}),'remote');assert.equal(workMode(role),'unknown');assert.equal(workMode({...role,location:'Hybrid, Charlotte'}),'hybrid');
 assert.equal(payType({description:'Paid time off and great benefits'}),'unknown');assert.equal(payType({description:'Unpaid internship with training'}),'unpaid');assert.equal(payType({description:'$20 per hour'}),'paid');
 assert.ok(matchesAdvanced(role,{query:'surveys SPSS',region:'NC'},now));assert.ok(!matchesAdvanced(role,{region:'NY'},now));assert.ok(!matchesAdvanced(role,{mode:'remote'},now));
 assert.ok(matchesAdvanced({...role,datePosted:'2026-11-05'},{postedDays:'7'},now));assert.ok(!matchesAdvanced({...role,datePosted:null},{postedDays:'7'},now));
});
test('freshness never equates community observations or access failures with employer verification',()=>{
 assert.equal(listingStatus(role,now).state,'current');assert.equal(listingStatus({...role,lastSeen:'2026-10-01'},now).state,'stale');
 assert.equal(listingStatus({...role,verification:'community-index',observedAt:'2026-11-06'},now).state,'review');
 assert.equal(listingStatus({...role,deadline:'2026-11-01'},now).state,'closed');assert.equal(deadlineTime('2026-02-30'),null);
 assert.equal(inspectPosting(role,{status:403},now).state,'unknown');assert.equal(inspectPosting(role,{status:410},now).state,'closed');
 assert.equal(inspectPosting(role,{status:200,body:'<h1>All careers</h1>'},now).state,'unknown');
 assert.equal(inspectPosting(role,{status:200,body:'This job is no longer available.'},now).state,'closed');
 const json=validThrough=>`<script type="application/ld+json">${JSON.stringify({'@type':'JobPosting',title:role.title,validThrough})}</script>`;
 assert.equal(inspectPosting(role,{status:200,body:json('2026-11-01')},now).state,'closed');assert.equal(inspectPosting(role,{status:200,body:json('2026-12-01')},now).state,'present');
 assert.equal(publicPostingUrl('https://127.0.0.1/job'),null);assert.equal(publicPostingUrl('https://x.local/job'),null);assert.equal(publicPostingUrl('http://example.org/job'),null);assert.equal(publicAddress('192.168.1.1'),false);assert.equal(publicAddress('::ffff:7f00:1'),false);
});
test('verifier removes confirmed closures but retains unknowns without changing collection timestamps',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ninerpath-quality-')),root=pathToFileURL(dir+'/');
 try{
  const feed={updatedAt:'2026-11-05T12:00:00Z',roles:[{...role,verification:'community-index'},{...role,id:'r2',url:'https://example.org/jobs/2',verification:'community-index'}]};
  for(const file of ['opportunities.json','sociology-opportunities.json'])await writeFile(new URL(file,root),JSON.stringify(feed));
  await verifyFeeds(root,{now,check:async r=>r.id==='r1'?{state:'closed',reason:'HTTP 404'}:{state:'unknown',reason:'HTTP 403'}});
  const data=JSON.parse(await readFile(new URL('opportunities.json',root)));
  assert.equal(data.total,1);assert.equal(data.roles[0].id,'r2');assert.equal(data.roles[0].listingCheck.state,'unknown');assert.equal(data.updatedAt,feed.updatedAt);assert.equal(data.verificationSummary.confirmedClosedRemoved,1);
  assert.equal(JSON.parse(await readFile(new URL('closed-listings.json',root))).roles.length,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('expanded undergraduate screen rejects required completed degrees and professional placements',async()=>{
 for(const filename of ['opportunity-rules.json','sociology-rules.json']){
  const rules=JSON.parse(await readFile(new URL('../'+filename,import.meta.url)));
  for(const description of ["Bachelor's degree in psychology required.",'Must be an MSW student.','Must be a current Duke University student.','Must hold an active clinical license.'])assert.equal(opportunityKind('Research Intern',description,rules),null,description);
  for(const description of ["Bachelor's degree preferred; undergraduates welcome.",'Currently pursuing a bachelor degree.','Requires a bachelor degree by the start of the internship.','Must be enrolled at UNC Charlotte.'])assert.equal(opportunityKind('Research Intern',description,rules),'internship',description);
 }
 assert.ok(studentEligibilityNotes('HR Intern','A minimum GPA is required. Juniors preferred.').some(n=>n.startsWith('GPA')));
});
test('ranking provides reasons, preserves internships and reduces scores for evidenced requirement gaps',()=>{
 const prefs={paths:[role.careerPath],location:'Charlotte'};
 const matching=relevance(role,prefs,null,now),other=relevance({...role,careerPath:'Clinical / pre-therapy',location:'Boston'},prefs,null,now);
 assert.ok(matching.score>other.score);assert.ok(matching.reasons.includes('Preferred career path'));assert.ok(relevance(role,prefs,{requiredGaps:1},now).score<matching.score);
});
test('tracker updates preserve notes and CSV protects spreadsheet formulas and quoted lines',()=>{
 let store=updateApplication({},role,'Preparing','2026-11-06');store.r1.notes='=HYPERLINK("bad")\nsecond line';store=updateApplication(store,role,'Applied','2026-11-07');
 assert.equal(store.r1.addedAt,'2026-11-06');assert.equal(store.r1.status,'Applied');assert.match(store.r1.notes,/HYPERLINK/);
 const csv=trackerCSV(Object.values(store));assert.ok(csv.startsWith('\uFEFF'));assert.match(csv,/'=HYPERLINK\(""bad""\)/);assert.match(csv,/second line/);assert.throws(()=>updateApplication({},role,'Invalid'));
});
test('alerts establish a first-visit baseline, honor preferences/read state and skip deadlines already applied to',()=>{
 assert.equal(alertCandidates([role],{baseline:null},now).length,0);
 assert.equal(alertCandidates([role],{baseline:[],preferences:{paths:[role.careerPath]}},now)[0].kind,'new');
 assert.equal(alertCandidates([role],{baseline:[],preferences:{paths:['other']}},now).length,0);
 assert.equal(alertCandidates([role],{baseline:[],read:['new:r1']},now).length,0);
 assert.equal(alertCandidates([role],{baseline:['r1'],saved:['r1']},now)[0].kind,'deadline');
 assert.equal(alertCandidates([role],{baseline:['r1'],tracked:{r1:{status:'Applied'}}},now).length,0);
 assert.equal(alertCandidates([{...role,deadline:'2020-01-01'}],{baseline:[],saved:['r1']},now).length,0);
});

test('a closure banner takes precedence over stale JobPosting markup',()=>{
 const body=`<h1>This job is no longer available</h1><script type="application/ld+json">${JSON.stringify({'@type':'JobPosting',title:role.title})}</script>`;
 assert.equal(inspectPosting(role,{status:200,body},now).state,'closed');
 assert.equal(inspectPosting(role,{status:200,body:'If this job is closed please use our search.'},now).state,'unknown');
});
test('qualification exceptions do not leak between sentences',async()=>{
 const rules=JSON.parse(await readFile(new URL('../opportunity-rules.json',import.meta.url)));
 assert.equal(opportunityKind('HR Intern',"Bachelor's degree required. Master's preferred.",rules),null);
 assert.equal(opportunityKind('HR Intern',"Must be enrolled in a master's or bachelor's program.",rules),'internship');
 assert.equal(opportunityKind('HR Intern',"A bachelor's background is useful. Must be enrolled in a doctoral program.",rules),null);
});

test('city searches include location-only matches and normalize state names without mixing separate locations',async()=>{
 const {matchesLocation}=await import('../student-tools.mjs');
 const seattle={...role,title:'Talent Acquisition Intern',description:'Undergraduate recruiting experience.',location:'Chicago, Illinois; Seattle, Washington, United States'};
 assert.ok(matchesAdvanced(seattle,{query:'Seattle'},now));
 assert.ok(matchesAdvanced(seattle,{location:'Seattle, WA'},now));
 assert.ok(matchesLocation('Seattle, WA','Seattle Washington'));
 assert.ok(matchesLocation('Seattle, Washington','seattle wa'));
 assert.ok(!matchesLocation('Boston, Massachusetts; Seattle, Washington','Boston WA'));
 assert.ok(!matchesLocation('Boston, Massachusetts','Seattle'));
 assert.ok(!matchesState('Washington, DC','WA'));assert.ok(matchesState('Washington, DC','DC'));
 assert.ok(!matchesLocation('Washington, DC','WA'));assert.ok(matchesLocation('Raleigh, North Carolina','Raleigh NC'));assert.ok(matchesLocation('Raleigh, NC','Raleigh North Carolina'));
 assert.ok(matchesQuery('Policy Intern Seattle Washington','Seattle -Boston'));
});

test('major-city aliases work in either field and city counts do not inflate multi-location roles',async()=>{
 const {CITY_AREAS,cityCoverage,findCitySearch,matchesLocation}=await import('../student-tools.mjs');
 assert.ok(CITY_AREAS.length>=50);
 for(const [location,query] of [['New York, New York','NYC'],['Brooklyn, NY','New York City'],['Los Angeles, CA','LA'],['San Francisco, California','SF'],['Washington, District of Columbia','DC']]){
  assert.ok(matchesAdvanced({...role,location},{query},now),query+' keyword');
  assert.ok(matchesLocation(location,query),query+' location');
 }
 assert.equal(findCitySearch('Washington'),null);
 assert.ok(!matchesLocation('Albany, New York','NYC'));
 assert.ok(!matchesLocation('South San Francisco, CA','SF'));
 assert.ok(!matchesAdvanced({...role,location:'Boston, MA',description:'Our headquarters is in New York City.'},{query:'NYC'},now));
 const counts=cityCoverage([{...role,location:'New York, NY; Brooklyn, NY; Seattle, WA'},{...role,id:'entry',location:'Seattle, Washington',opportunityKind:'entry-level'},{...role,id:'closed',location:'Seattle, WA',deadline:'2020-01-01'}],now);
 assert.equal(counts.find(c=>c.id==='new-york').internships,1);
 assert.equal(counts.find(c=>c.id==='seattle').internships,1);
 assert.equal(counts.find(c=>c.id==='seattle').experience,1);
 assert.equal(counts.find(c=>c.id==='atlanta').internships,0);
});

test('city search recognizes ATS location formats without confusing nearby cities or street names',async()=>{
 const {matchesLocation}=await import('../student-tools.mjs');
 for(const [location,query] of [['Massachusetts-Boston','Boston'],['Hybrid - Denver','Denver'],['United States - Ohio - Columbus','Columbus OH'],['US - Cambridge Kendall SQ - MA','Cambridge MA'],['AAO Milwaukee - 750 W Virginia St','Milwaukee']])assert.ok(matchesLocation(location,query),location);
 assert.ok(!matchesLocation('Columbus, GA','Columbus OH'));
 assert.ok(!matchesLocation('US - GA - Columbus','Columbus OH'));
 assert.ok(!matchesLocation('US - NC - Seattle','Seattle WA'));
 assert.ok(!matchesLocation('South San Francisco, CA','San Francisco'));
 assert.ok(!matchesLocation('US - MA - Boston - 200 Cambridge Street','Cambridge MA'));
 assert.ok(!matchesLocation('Cambridge, United Kingdom','Cambridge MA'));
});
