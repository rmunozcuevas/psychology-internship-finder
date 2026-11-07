// Daily, bounded page checks. A blocked request is unknown, never a closure.
import {readFile,writeFile} from 'node:fs/promises';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {deadlineTime,feedCounts,listingStatus} from '../listing-quality.mjs';
export function publicPostingUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&!isIP(u.hostname.replace(/[\[\]]/g,''))&&u.hostname.includes('.')&&!/(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(u.hostname)?u:null;}catch{return null;}
}
export function publicAddress(address){
 if(isIP(address)===4)return !/^(?:0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|198\.(?:18|19)\.|22[4-9]\.|23\d\.|24\d\.|25[0-5]\.)/.test(address);
 return isIP(address)===6&&!/^(?:::|::1$|f[cd]|fe[89ab]|ff)/i.test(address)&&!address.includes('.')&&!/^::ffff:/i.test(address);
}
function postings(value){if(!value||typeof value!=='object')return [];if(Array.isArray(value))return value.flatMap(postings);return [...([value['@type']].flat().includes('JobPosting')?[value]:[]),...postings(value['@graph'])];}
const titleKey=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function inspectPosting(role,{status,body='',redirectedTo=''},now=Date.now()){
 if(status===404||status===410)return {state:'closed',reason:`Source returned HTTP ${status}`};
 if(status!==200)return {state:'unknown',reason:`Source could not be verified (HTTP ${status})`};
 if(/captcha|verify you are human|access denied|just a moment/i.test(body.slice(0,12000)))return {state:'unknown',reason:'Source requires an interactive check'};
 const visible=body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
 const closure=/\bthis (?:job|position|posting) (?:is no longer available|has been filled|has expired|is closed)\b|\bthe job you (?:are looking for|requested) (?:is no longer available|has expired)\b/i.exec(visible);
 if(closure&&!/\b(?:if|whether|when)\s+$/i.test(visible.slice(Math.max(0,closure.index-20),closure.index)))return {state:'closed',reason:'Source explicitly says this posting is closed'};
 for(const match of body.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  let rows;try{rows=postings(JSON.parse(match[1]));}catch{continue;}
  for(const row of rows){
   if(titleKey(row.title)!==titleKey(role.title))continue;
   const expires=deadlineTime(row.validThrough);
   if(expires!==null&&expires<now)return {state:'closed',reason:'Matching JobPosting validThrough has passed'};
   return {state:'present',reason:'Matching structured JobPosting found',...(row.validThrough?{validThrough:row.validThrough}:{})};
  }
 }
 return {state:'unknown',reason:redirectedTo?'Page redirected; no matching posting could be confirmed':'Page loaded, but no matching structured posting was found'};
}
async function fetchCheck(role){
 let url=publicPostingUrl(role.url);if(!url)return {state:'unknown',reason:'Unsupported posting URL'};
 const signal=AbortSignal.timeout(10000);
 try{
  for(let redirects=0;redirects<=3;redirects++){
   const addresses=await lookup(url.hostname,{all:true});if(!addresses.length||!addresses.every(a=>publicAddress(a.address)))return {state:'unknown',reason:'Source is not a public network address'};
   const response=await fetch(url,{redirect:'manual',signal,headers:{'user-agent':'NinerPath/1.0 (public internship availability check)','accept':'text/html'}});
   if(response.status>=300&&response.status<400){await response.body?.cancel();const next=publicPostingUrl(new URL(response.headers.get('location')||'',url).href);if(!next)return {state:'unknown',reason:'Unsupported redirect'};url=next;continue;}
   let body='';if(response.status===200&&response.body){const reader=response.body.getReader();const decoder=new TextDecoder();let bytes=0;try{while(bytes<750000){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;body+=decoder.decode(value,{stream:true});}}finally{await reader.cancel();}}
   else await response.body?.cancel();
   return inspectPosting(role,{status:response.status,body,redirectedTo:redirects?url.href:''});
  }
  return {state:'unknown',reason:'Too many redirects'};
 }catch{return {state:'unknown',reason:'Source timed out or could not be reached'};}
}
export async function verifyFeeds(root=new URL('../',import.meta.url),{check=fetchCheck,now=Date.now(),limit=Infinity}={}){
 const files=['opportunities.json','sociology-opportunities.json'],feeds=await Promise.all(files.map(async f=>JSON.parse(await readFile(new URL(f,root),'utf8'))));
 const candidates=new Map();for(const feed of feeds)for(const r of feed.roles)if(r.verification==='community-index'||listingStatus(r,now).state==='stale')candidates.set(r.url,r);
 const results=new Map();let next=0;const rows=[...candidates.values()].slice(0,limit);
 await Promise.all(Array.from({length:6},async()=>{while(next<rows.length){const role=rows[next++];results.set(role.url,{...await check(role),checkedAt:new Date(now).toISOString()});}}));
 const oldArchive=JSON.parse(await readFile(new URL('closed-listings.json',root),'utf8').catch(()=>'{"roles":[]}'));
 const archive=new Map(oldArchive.roles.map(r=>[r.id,r]));
 for(let i=0;i<feeds.length;i++){
  const feed=feeds[i],originalTotal=feed.roles.length,active=[];
  const ownResults=feed.roles.map(r=>results.get(r.url)).filter(Boolean);
  for(const original of feed.roles){const r={...original,...(results.has(original.url)?{listingCheck:results.get(original.url)}:{})};const status=listingStatus(r,now);
   if(status.state==='closed'){archive.set(r.id,{id:r.id,title:r.title,org:r.org,url:r.url,deadline:r.deadline||r.listingCheck?.validThrough||null,closedAt:new Date(now).toISOString(),reason:status.reason});continue;}active.push(r);
  }
  feed.roles=active;feed.total=active.length;feed.counts=feedCounts(active);feed.verificationSummary={checkedAt:new Date(now).toISOString(),pageChecks:ownResults.length,confirmedClosedRemoved:originalTotal-active.length,unknown:ownResults.filter(r=>r.state==='unknown').length};
  // Keep collected-at separate from verified-at; a failed source must never look freshly collected.
  await writeFile(new URL(files[i],root),JSON.stringify(feed,null,2)+'\n');
 }
 const archived=[...archive.values()].filter(r=>Date.parse(r.closedAt)>=now-90*86400000).slice(-5000);
 await writeFile(new URL('closed-listings.json',root),JSON.stringify({updatedAt:new Date(now).toISOString(),roles:archived},null,2)+'\n');
 return {checked:results.size,archived:archived.length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(await verifyFeeds());
