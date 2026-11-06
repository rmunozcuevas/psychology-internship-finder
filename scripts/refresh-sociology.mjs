// Seed/rebuild sociology from retained employer observations and a fresh community index.
// The daily shared collector additionally screens every raw employer posting for both fields.
import {readFile,writeFile} from 'node:fs/promises';
import {communityJobs} from './community.mjs';
import {sociologyFeed} from './sociology.mjs';
const rules=JSON.parse(await readFile(new URL('../sociology-rules.json',import.meta.url),'utf8'));
const psychology=JSON.parse(await readFile(new URL('../opportunities.json',import.meta.url),'utf8'));
const response=await communityJobs(async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error(`Community source HTTP ${r.status}`);return r.json();});
const observedAt=new Date().toISOString();
const community=response.map(r=>({...r,org:r.company,lastSeen:observedAt,sourceId:'community:searchtern'}));
const employers=psychology.roles.filter(r=>r.verification!=='community-index');
const data=sociologyFeed([...community,...employers],rules,{updatedAt:observedAt,source:'Retained employer observations and a fresh community index',coverageBasis:'Initial sociology snapshot uses previous employer observations plus the current community index. The noon shared collector screens raw employer postings for both disciplines.',errors:[]});
await writeFile(new URL('../sociology-opportunities.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify(data.counts,null,2));
