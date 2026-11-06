import {readFile,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {opportunityKind,careerPath} from '../eligibility.mjs';
import {classify,plain} from './relevance.mjs';
import {postingKey} from './posting-key.mjs';
import {refreshLocalPrograms} from './local-programs.mjs';
const rules=JSON.parse(await readFile(new URL('../opportunity-rules.json',import.meta.url),'utf8'));
const directories=process.argv.slice(2);if(!directories.length)throw Error('Pass completed snapshot directories');
const roles=new Map(),sources=new Map(),errors=[];
for(const directory of directories){
 const data=JSON.parse(await readFile(resolve(directory,'opportunities.json'),'utf8'));
 const health=JSON.parse(await readFile(resolve(directory,'source-health.json'),'utf8'));
 for(const report of health.sources){const key=`${report.kind}:${report.id}`;const checkedAt=report.checkedAt||health.updatedAt;const old=sources.get(key);if(!old||Date.parse(checkedAt)>=Date.parse(old.checkedAt))sources.set(key,{...report,checkedAt});}
 for(const row of data.roles){
  const title=plain(row.title),description=plain(row.description||'');
  const kind=opportunityKind(title,description,rules),type=classify(title,description,rules);
  if(!kind||!type||!/^https:\/\//.test(row.url))continue;
  if(row.deadline && Date.parse(String(row.deadline).slice(0,10)+'T23:59:59Z')<Date.now())continue;
  const key=postingKey(row.url),existing=roles.get(key);
  if(existing && existing.verification!=='community-index'&&row.verification==='community-index')continue;
  let org=plain(row.org);
  if(/us-erac\.icims\.com/.test(row.url)&&/Enterprise Mobility/i.test(description))org='Enterprise Mobility';
  roles.set(key,{...row,id:key,title,org,description,opportunityKind:kind,type,careerPath:careerPath(title,rules)});
 }
}
const rows=[...roles.values()].sort((a,b)=>(a.opportunityKind==='internship'?0:1)-(b.opportunityKind==='internship'?0:1)||(a.season==='Summer 2027'?0:1)-(b.season==='Summer 2027'?0:1)||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
const reports=[...sources.values()];
for(const report of reports)if(report.status!=='ok')errors.push(`${report.kind} ${report.id}: ${report.error||'partial source read'}`);
const sourceCoverage={configured:reports.length,healthy:reports.filter(r=>r.status==='ok').length,failed:reports.filter(r=>r.status!=='ok').length,scannedPostings:reports.reduce((n,r)=>n+(r.scanned||0),0)};
const internships=rows.filter(r=>r.opportunityKind==='internship');
const counts={internships:internships.length,focused:internships.filter(r=>r.careerPath!=='Broader management / leadership').length,broaderManagement:internships.filter(r=>r.careerPath==='Broader management / leadership').length,employerFeedInternships:internships.filter(r=>r.verification!=='community-index').length,communityInternshipCandidates:internships.filter(r=>r.verification==='community-index').length,entryLevel:rows.filter(r=>r.opportunityKind==='entry-level').length};
await refreshLocalPrograms();
const updatedAt=new Date().toISOString();
async function save(name,value){const path=new URL('../'+name,import.meta.url),temp=new URL('../'+name+'.tmp',import.meta.url);await writeFile(temp,JSON.stringify(value,null,2)+'\n');await rename(temp,path);}
await save('source-health.json',{updatedAt,...sourceCoverage,sources:reports});
await save('opportunities.json',{updatedAt,lastAttemptAt:updatedAt,source:'Employer APIs and separately labeled community index',sourceCoverage,counts,total:rows.length,refreshed:rows.length,roles:rows,errors});
console.log(JSON.stringify({counts,sourceCoverage},null,2));
