import {listingStatus,deadlineTime} from './listing-quality.mjs';
export const TRACKER_STATUSES=['Preparing','Applied','Interviewing','Offer','Not selected','Withdrawn'];
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function matchesQuery(text,query){
 const source=norm(text),tokens=[...String(query||'').replace(/[“”]/g,'"').matchAll(/(-?)"([^"]+)"|(-?)([^\s"]+)/g)];
 return tokens.every(m=>{const excluded=Boolean(m[1]||m[3]),value=norm(m[2]||m[4]);return excluded?!source.includes(value):source.includes(value);});
}
export function workMode(role){
 const value=norm(role.workMode||role.workplaceType||role.location||role.place);
 if(/\bhybrid\b/.test(value))return 'hybrid';if(role.isRemote===true||/\bremote\b/.test(value))return 'remote';
 if(/\bon.?site\b|in.person/.test(value))return 'onsite';return 'unknown';
}
export function payType(role){
 const text=`${role.pay||''} ${role.description||''}`;
 if(/\bunpaid\b|without (?:pay|compensation)/i.test(text))return 'unpaid';
 if(/\$\s*\d|\bpaid (?:intern|position|placement)|\bstipend\b|(?:hourly|salary|compensation|pay) (?:range|rate|of|starts)/i.test(text))return 'paid';
 return 'unknown';
}
export const STATE_NAMES={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
export function matchesState(location,state){
 if(!state)return true;const name=STATE_NAMES[state];if(!name)return false;
 return norm(location).includes(norm(name))||new RegExp(`(?:^|[,;/\\s])${state}(?:$|[,;/\\s])`).test(location||'');
}
export function sourcePostedDate(role){
 if(role.source==='Greenhouse'&&!role.dateUpdated)return null;
 const value=role.datePosted||role.date_posted||role.date;
 if(deadlineTime(value)===null)return null;
 return Date.parse(value.length===10?value+'T00:00:00Z':value);
}
export function matchesAdvanced(role,filters,now=Date.now()){
 const location=role.location||role.place||'',description=role.description||role.desc||'';
 if(!matchesQuery(`${role.title} ${role.org} ${role.careerPath} ${(role.skills||[]).join(' ')} ${description}`,filters.query))return false;
 if(filters.location&&!norm(location).includes(norm(filters.location)))return false;
 if(filters.region&&!matchesState(location,filters.region))return false;
 if(filters.mode&&filters.mode!=='all'&&workMode(role)!==filters.mode)return false;
 if(filters.compensation&&filters.compensation!=='all'&&payType({...role,description})!==filters.compensation)return false;
 if(filters.trusted&&listingStatus(role,now).state!=='current')return false;
 if(filters.postedDays&&filters.postedDays!=='all'){const date=sourcePostedDate(role);if(date===null||date<now-Number(filters.postedDays)*86400000||date>now+86400000)return false;}
 return true;
}
export function relevance(role,preferences={},assessment=null,now=Date.now()){
 let score=0;const reasons=[];
 const add=(value,reason)=>{score+=value;reasons.push(reason);};
 if(role.opportunityKind==='internship')add(40,'Internship / student placement');
 if((role.season||role.duration)==='Summer 2027')add(20,'Summer 2027 stated');
 if((preferences.paths||[]).includes(role.careerPath))add(35,'Preferred career path');
 if(preferences.location&&norm(role.location||role.place).includes(norm(preferences.location)))add(12,'Preferred location');
 if(preferences.mode&&preferences.mode!=='all'&&workMode(role)===preferences.mode)add(8,'Preferred work setting');
 if(preferences.paid&&payType(role)==='paid')add(6,'Paid opportunity stated');
 if(Number.isFinite(role.match)&&role.match>0)add(Math.round(role.match/5),'Listed skills found in resume');
 if(assessment?.requiredGaps){score-=25*assessment.requiredGaps;reasons.push('Potential requirement gaps — review');}
 if(listingStatus(role,now).state==='stale'){score-=15;reasons.push('Availability needs rechecking');}
 return {score,reasons};
}
const safeCell=value=>{const text=String(value??'');return '"'+(/^[\s]*[=+@-]|^[\t\r]/.test(text)?"'"+text:text).replace(/"/g,'""')+'"';};
export function trackerCSV(rows){
 const keys=['title','org','status','location','url','deadline','nextAction','notes','addedAt','updatedAt'];
 return '\uFEFF'+[keys.map(safeCell).join(','),...rows.map(r=>keys.map(k=>safeCell(r[k])).join(','))].join('\r\n');
}
export function updateApplication(store,role,status='Preparing',now=new Date().toISOString()){
 if(!TRACKER_STATUSES.includes(status))throw Error('Invalid application status');
 const id=String(role.id);return {...store,[id]:{...store[id],id,title:role.title,org:role.org,url:role.url,location:role.location||role.place||'',careerPath:role.careerPath,deadline:role.deadline||'',status,notes:store[id]?.notes||'',nextAction:store[id]?.nextAction||'',addedAt:store[id]?.addedAt||now,updatedAt:now}};
}
export function alertCandidates(roles,{baseline=null,read=[],preferences={},tracked={},saved=[],scope='shortlist',days=7}={},now=Date.now()){
 const seen=new Set(baseline||[]),ack=new Set(read),shortlist=new Set([...Object.keys(tracked),...saved].map(String));
 const matches=role=>!(preferences.paths?.length&&!preferences.paths.includes(role.careerPath))&&(!preferences.location||norm(role.location||role.place).includes(norm(preferences.location)))&&(!preferences.mode||preferences.mode==='all'||workMode(role)===preferences.mode);
 const alerts=[];
 for(const role of roles){if(listingStatus(role,now).state==='closed')continue;
  if(baseline!==null&&!seen.has(String(role.id))&&matches(role)){const id=`new:${role.id}`;if(!ack.has(id))alerts.push({id,roleId:String(role.id),kind:'new',title:role.title,org:role.org,url:role.url,detail:'Added to the catalogue since your last acknowledged visit'});}
  const due=deadlineTime(role.deadline),inScope=shortlist.has(String(role.id))||(scope==='preferences'&&matches(role));
  const terminal=['Applied','Interviewing','Not selected','Withdrawn','Offer'].includes(tracked[String(role.id)]?.status);
  if(inScope&&!terminal&&due!==null&&due>=now&&due-now<=Number(days)*86400000){const id=`deadline:${role.id}:${role.deadline}`;if(!ack.has(id))alerts.push({id,roleId:String(role.id),kind:'deadline',title:role.title,org:role.org,url:role.url,detail:`Application deadline: ${String(role.deadline).slice(0,10)}`,due});}
 }
 return alerts.sort((a,b)=>(a.kind==='deadline'?0:1)-(b.kind==='deadline'?0:1)||(a.due||0)-(b.due||0)||a.title.localeCompare(b.title));
}
