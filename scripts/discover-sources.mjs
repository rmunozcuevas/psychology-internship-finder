import {readFile,writeFile} from 'node:fs/promises';
const DIRECTORY='https://kalebconfer-sys.github.io/job-board-directory/job-board-directory.json';
export function normalizeBoard(row){
  try {
    const u=new URL(row.api_url), parts=u.pathname.split('/').filter(Boolean);
    if(row.platform==='workday' && /^[a-z0-9-]+\.wd\d+\.myworkdayjobs\.com$/i.test(u.hostname) && parts[0]==='wday' && parts[1]==='cxs' && parts.length===5)
      return {kind:'workday',id:`${u.hostname}|${parts[2]}|${parts[3]}`,employer:String(row.company),url:String(row.board_url),discoverySource:DIRECTORY};
    const hosts={greenhouse:'boards-api.greenhouse.io',ashby:'api.ashbyhq.com',lever:'api.lever.co'};
    if(u.hostname!==hosts[row.platform])return null;
    let id=row.platform==='greenhouse'?parts[parts.indexOf('boards')+1]:row.platform==='lever'?parts[parts.indexOf('postings')+1]:parts[parts.indexOf('job-board')+1];
    if(!id||!/^[-a-z0-9_.]+$/i.test(id))return null;
    return {kind:row.platform,id,employer:String(row.company),url:String(row.board_url),discoverySource:DIRECTORY};
  }catch{return null}
}
export async function discoverSources(){
  const response=await fetch(DIRECTORY,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error(`Discovery directory HTTP ${response.status}`);
  const data=await response.json();
  const priority=/psych|behavior|mental|health|hospital|clinic|research|child|youth|family|families|community|social|humanservice|rescue|refugee|autism|counsel|nonprofit|charit|education|school|university|labor|workforce|people/i;
  const quotas={greenhouse:1800,ashby:500,lever:150,workday:250};
  const selected=[];
  for(const [kind,limit] of Object.entries(quotas)){
    const rows=data.filter(r=>r.platform===kind&&r.open_roles>0).sort((a,b)=>Number(priority.test(b.company))-Number(priority.test(a.company))||b.open_roles-a.open_roles);
    const seen=new Set();
    for(const row of rows){const board=normalizeBoard(row);if(!board||seen.has(board.id))continue;seen.add(board.id);selected.push({...board,directoryOpenRoles:row.open_roles});if(seen.size>=limit)break;}
  }
  await writeFile(new URL('../discovered-boards.json',import.meta.url),JSON.stringify({updatedAt:new Date().toISOString(),source:DIRECTORY,selection:'Psychology, community, healthcare, education and research employers first; then larger employers for HR and related placements. Candidates require a successful live API read.',boards:selected},null,2)+'\n');
  console.log(`Discovered ${selected.length} employer-board candidates from ${data.length} directory rows.`);
}
if(process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) await discoverSources();
