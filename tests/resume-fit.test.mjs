import test from 'node:test';
import assert from 'node:assert/strict';
import {assessRole,resumeFacts,skillEvidence} from '../resume-fit.mjs';
const check=(description,profile={},text='')=>assessRole({description,skills:[],verification:'employer-api'},{profile,text});
const area=(result,name)=>result.checks.find(c=>c.area===name);
test('GPA comparisons use confirmed values, retain evidence and respect alternatives',()=>{
 const text='Bachelor of Arts in Psychology\nGPA: 3.2/4.0';
 assert.equal(resumeFacts(text).gpa.value,'3.2');
 assert.equal(area(check('Minimum GPA of 3.5 required.',{},text),'gpa').status,'unknown');
 const gap=check('Minimum GPA of 3.5 required.',{gpa:'3.2'},text);
 assert.equal(area(gap,'gpa').status,'gap');assert.equal(gap.requiredGaps,1);
 assert.match(area(gap,'gpa').evidence,/3.2/);
 assert.equal(area(check('Minimum GPA of 3.0 required.',{gpa:'3.2'}),'gpa').status,'met');
 assert.equal(area(check('GPA 3.0 or higher preferred.',{gpa:'2.7'}),'gpa').kind,'preferred');
 assert.equal(check('GPA 3.0 or higher preferred.',{gpa:'2.7'}).requiredGaps,0);
 assert.equal(area(check('Minimum GPA of 3.5 or equivalent work experience required.',{gpa:'3.2'}),'gpa').status,'unknown');
 assert.equal(area(check('No minimum GPA required.',{gpa:'2.0'}),'gpa').status,'unknown');
 assert.equal(resumeFacts('GPA: 4.8/5.0').gpa,undefined);
 assert.equal(resumeFacts('GPA: 3.2/5.0').gpa,undefined);
});
test('major, enrollment and graduation checks leave ambiguous conditions unknown',()=>{
 assert.equal(area(check('Must be pursuing a degree in psychology or sociology.',{major:'psychology'}),'major').status,'met');
 assert.equal(area(check('A degree in education is required.',{major:'psychology'}),'major').status,'unknown');
 assert.equal(area(check('Psychology majors are not accepted.',{major:'psychology'}),'major').status,'unknown');
 assert.equal(area(check('Must be currently enrolled.',{enrollment:'not-enrolled'}),'enrollment').status,'gap');
 assert.equal(area(check('Must be currently enrolled as a senior.',{enrollment:'enrolled'}),'enrollment').status,'unknown');
 assert.equal(area(check('Required graduation between December 2027 and June 2029.',{graduation:'2028-05'}),'graduation').status,'met');
 assert.equal(area(check('Required graduation between December 2027 and June 2029.',{graduation:'2027-05'}),'graduation').status,'gap');
 assert.equal(area(check('Graduating in 2028 required.',{graduation:'2028-05'}),'graduation').status,'unknown');
});
test('certification gaps require explicit confirmation; post-hire training is not a gap',()=>{
 assert.equal(area(check('CPR certification is required.',{certifications:'none'}),'certification').status,'gap');
 assert.equal(area(check('CPR certification is required.'),'certification').status,'unknown');
 assert.equal(area(check('CPR certification is required.',{certifications:'CPR'}),'certification').status,'met');
 assert.equal(area(check('CPR certification is not required.',{certifications:'none'}),'certification').status,'unknown');
 assert.equal(area(check('Must obtain CPR certification within 30 days.',{certifications:'none'}),'certification').status,'unknown');
 assert.equal(area(check('CPR or BLS certification required.',{certifications:'CPR'}),'certification').status,'unknown');
});
test('experience and skills do not become proof of eligibility',()=>{
 const skills=skillEvidence('Research assistant at a student lab. Product development experience.',{'research methods':['research'],'child development':['child development'],'data analysis':['data']});
 assert.ok(skills['research methods']);assert.equal(skills['child development'],undefined);assert.equal(skills['data analysis'],undefined);
 const result=assessRole({description:'Minimum 2 years of clinical research experience required.',skills:['Research methods','Data analysis'],verification:'community-index'},{text:'Research assistant at a student lab.',skills});
 assert.equal(area(result,'experience').status,'unknown');assert.equal(result.requiredGaps,0);
 assert.equal(result.checks.find(c=>c.requirement==='Data analysis').status,'unknown');assert.equal(result.incomplete,true);
 assert.equal(check('').noRequirements,true);
});
