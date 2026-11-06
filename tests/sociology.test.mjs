import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sociologyRecord,sociologyFeed} from '../scripts/sociology.mjs';
const rules=JSON.parse(await readFile(new URL('../sociology-rules.json',import.meta.url)));
const row=(title,description='Open to undergraduate students')=>({title,description,url:'https://example.org/jobs/123',org:'Example'});
test('sociology screens subjects, undergraduate access and technical false matches',()=>{
 for(const title of ['Policy Research Intern','Community Outreach Intern','Survey Research Intern','Human Resources Intern'])assert.equal(sociologyRecord(row(title),rules)?.opportunityKind,'internship',title);
 for(const title of ['Land Survey Intern','Energy Market Research and Engineering Intern','Application Development Intern','2027 Future Talent Program - Chemical Biology - Co-op','Policy Research PhD Intern'])assert.equal(sociologyRecord(row(title),rules),null,title);
 assert.equal(sociologyRecord(row('Policy Intern','Only open to Princeton students.'),rules),null);
 assert.equal(sociologyRecord(row('Policy Intern','Must be enrolled in a doctoral program.'),rules),null);
 assert.equal(sociologyRecord(row('Management Internship'),rules)?.careerPath,'Broader management / leadership');
});
test('sociology deduplicates and preserves employer provenance and its own skill vocabulary',()=>{
 const employer={...row('Survey Research Intern','Survey design, interviews and program evaluation'),verification:'employer-api'};
 const feed=sociologyFeed([employer,{...employer,verification:'community-index'}],rules);
 assert.equal(feed.total,1);assert.equal(feed.counts.focused,1);
 assert.equal(feed.roles[0].verification,'employer-api');
 assert.ok(feed.roles[0].skills.includes('Survey design'));
 assert.ok(feed.roles[0].skills.includes('Program evaluation'));
});
