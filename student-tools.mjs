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
export const CITY_AREAS=[
 ['new-york','New York City','NY',['New York','NYC','Manhattan','Brooklyn','Queens','Bronx','Staten Island']],
 ['los-angeles','Los Angeles','CA',['LA','L.A.']],['chicago','Chicago','IL',[]],['houston','Houston','TX',[]],['phoenix','Phoenix','AZ',[]],['philadelphia','Philadelphia','PA',['Philly']],
 ['san-antonio','San Antonio','TX',[]],['san-diego','San Diego','CA',[]],['dallas','Dallas','TX',[]],['jacksonville','Jacksonville','FL',[]],['fort-worth','Fort Worth','TX',['Ft Worth']],
 ['austin','Austin','TX',[]],['san-jose','San Jose','CA',[]],['columbus','Columbus','OH',[]],['charlotte','Charlotte','NC',[]],['indianapolis','Indianapolis','IN',['Indy']],
 ['san-francisco','San Francisco','CA',['SF','San Fran']],['seattle','Seattle','WA',[]],['denver','Denver','CO',[]],['boston','Boston','MA',[]],['washington-dc','Washington','DC',['Washington DC','D.C.','DC','District of Columbia']],
 ['nashville','Nashville','TN',[]],['oklahoma-city','Oklahoma City','OK',['OKC']],['el-paso','El Paso','TX',[]],['las-vegas','Las Vegas','NV',['Vegas']],['baltimore','Baltimore','MD',[]],
 ['portland-or','Portland','OR',[]],['louisville','Louisville','KY',[]],['memphis','Memphis','TN',[]],['detroit','Detroit','MI',[]],['milwaukee','Milwaukee','WI',[]],['albuquerque','Albuquerque','NM',[]],
 ['tucson','Tucson','AZ',[]],['fresno','Fresno','CA',[]],['sacramento','Sacramento','CA',[]],['atlanta','Atlanta','GA',['ATL']],['kansas-city','Kansas City','MO',[]],['colorado-springs','Colorado Springs','CO',[]],
 ['raleigh','Raleigh','NC',[]],['durham','Durham','NC',[]],['greensboro','Greensboro','NC',[]],['miami','Miami','FL',[]],['tampa','Tampa','FL',[]],['orlando','Orlando','FL',[]],
 ['minneapolis','Minneapolis','MN',[]],['st-paul','Saint Paul','MN',['St Paul']],['cleveland','Cleveland','OH',[]],['cincinnati','Cincinnati','OH',[]],['pittsburgh','Pittsburgh','PA',[]],
 ['st-louis','Saint Louis','MO',['St Louis']],['salt-lake-city','Salt Lake City','UT',['Salt Lake']],['richmond','Richmond','VA',[]],['newark','Newark','NJ',[]],['providence','Providence','RI',[]],['oakland','Oakland','CA',[]],['cambridge','Cambridge','MA',[]]
].map(([id,name,state,aliases])=>({id,name,state,aliases,label:name+', '+state}));
const cityKey=value=>norm(value).replace(/[^a-z0-9]+/g,' ').trim();
const cityLookup=new Map();
for(const city of CITY_AREAS)for(const name of [city.name,...city.aliases])for(const value of [name,name+' '+city.state,name+' '+STATE_NAMES[city.state]])cityLookup.set(cityKey(value),city);
// Washington alone can mean the state, so only explicit D.C. variants select the city.
cityLookup.delete('washington');
export function findCitySearch(value){return cityLookup.get(cityKey(value))||null;}
export function matchesCity(location,city){
 const aliases=[city.name,...city.aliases].map(cityKey);
 return String(location||'').split(/;|\||\s\/\s/).some(part=>{
  const cityPart=cityKey(part.split(',')[0].replace(/\((?:remote|hybrid|on.?site)[^)]*\)/gi,''));
  const named=aliases.some(alias=>cityPart===alias||cityPart.startsWith(alias+' '+norm(STATE_NAMES[city.state]))||cityPart.startsWith(alias+' ')&&/^(?:area|metropolitan area|region|[a-z]{2}(?: |$))/.test(cityPart.slice(alias.length+1)));
  if(!named)return false;
  if(matchesState(part,city.state))return true;
  // Missing state data may match a unique named city, but never override a stated different state.
  const stated=Object.entries(STATE_NAMES).some(([code])=>matchesState(part,code));
  return !stated&&!['portland-or','washington-dc','kansas-city'].includes(city.id);
 });
}
const cityMatchesCache=new Map();
function citiesAtLocation(location){const key=String(location||'');if(cityMatchesCache.has(key))return cityMatchesCache.get(key);const cities=CITY_AREAS.filter(city=>matchesCity(key,city));if(cityMatchesCache.size>=3000)cityMatchesCache.delete(cityMatchesCache.keys().next().value);cityMatchesCache.set(key,cities);return cities;}
export function cityCoverage(roles,now=Date.now()){
 const counts=new Map(CITY_AREAS.map(city=>[city.id,{...city,internships:0,experience:0}]));
 for(const role of roles){if(listingStatus(role,now).state==='closed')continue;for(const city of citiesAtLocation(role.location||role.place)){const row=counts.get(city.id);if(role.opportunityKind==='internship')row.internships++;else if(role.opportunityKind==='entry-level')row.experience++;}}
 return [...counts.values()];
}
export function matchesState(location,state){
 if(!state)return true;const name=STATE_NAMES[state];if(!name)return false;
 const text=String(location||'').replace(/\bWashington\s*,?\s*(?:DC|D\.C\.|District of Columbia)\b/gi,'District of Columbia');
 return norm(text).includes(norm(name))||new RegExp(`(?:^|[,;/\\s])${state}(?:$|[,;/\\s])`).test(text);
}
const stateCodesByName=new Map(Object.entries(STATE_NAMES).map(([code,name])=>[name.toLowerCase(),code]));
const stateNamePattern=new RegExp(`\\b(?:${Object.values(STATE_NAMES).join('|')})\\b`,'gi');
const locationCache=new Map();
function locationSegments(location){
 const raw=String(location||'');if(locationCache.has(raw))return locationCache.get(raw);
 const segments=raw.split(/;|\||\s\/\s/).map(part=>{
  const text=part.replace(/\bWashington\s*,?\s*(?:DC|D\.C\.|District of Columbia)\b/gi,'District of Columbia');
  const names=text.replace(/\b[A-Z]{2}\b/g,code=>STATE_NAMES[code]||code);
  const codes=[...text.matchAll(stateNamePattern)].map(match=>stateCodesByName.get(match[0].toLowerCase())).join(' ');
  return norm(part+' '+names+' '+codes).replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
 });
 if(locationCache.size>=3000)locationCache.delete(locationCache.keys().next().value);locationCache.set(raw,segments);return segments;
}
export function matchesLocation(location,query){
 if(!String(query||'').trim())return true;
 const city=findCitySearch(query);if(city)return matchesCity(location,city);
 const code=String(query).trim().toUpperCase();if(/^[A-Z]{2}$/.test(code)&&STATE_NAMES[code])return matchesState(location,code);
 const tokens=norm(query).replace(/[^a-z0-9\s]/g,' ').trim().split(/\s+/).filter(Boolean);
 if(!tokens.length)return false;
 return locationSegments(location).some(segment=>tokens.every(token=>segment.includes(token)));
}
export function sourcePostedDate(role){
 if(role.source==='Greenhouse'&&!role.dateUpdated)return null;
 const value=role.datePosted||role.date_posted||role.date;
 if(deadlineTime(value)===null)return null;
 return Date.parse(value.length===10?value+'T00:00:00Z':value);
}
export function matchesAdvanced(role,filters,now=Date.now()){
 const location=role.location||role.place||'',description=role.description||role.desc||'';
 const queryCity=filters.query?findCitySearch(filters.query):null;
 if(queryCity&&!matchesCity(location,queryCity))return false;
 if(filters.query&&!queryCity&&!matchesQuery(`${role.title} ${role.org} ${role.careerPath} ${(role.skills||[]).join(' ')} ${description} ${locationSegments(location).join(' ')} ${citiesAtLocation(location).flatMap(city=>[city.name,...city.aliases]).join(' ')}`,filters.query))return false;
 if(filters.location&&!matchesLocation(location,filters.location))return false;
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
