import {deadlineTime} from '../listing-quality.mjs';
import {plain} from './relevance.mjs';
import {opportunityKind,careerPath} from '../eligibility.mjs';
import {postingKey} from './posting-key.mjs';

export function sociologyRelevance(title,description,rules,{preview=false}={}){
 const t=plain(title),body=plain(description),has=(key,value)=>new RegExp(rules[key],'i').test(value);
 if(has('hardExcludedTitle',t)||has('excludedTitle',t)||(has('irrelevantTitle',t)&&!has('relevanceExceptionTitle',t)))return null;
 if(/talent community|expression of interest|\bopportunities\s*$/i.test(t))return null;
 if(!preview&&has('researchGeneric',t)&&!has('researchFocusTitle',t)&&!has('researchFocusContext',body))return null;
 if(has('primaryTitle',t))return 'sociology';
 if(has('adjacentTitle',t))return 'adjacent';
 if(has('broaderTitle',t)){
   if(has('broaderExcludedTitle',t)&&!(/all majors|any major/i.test(body)||has('degreeContext',body)))return null;
   return 'broader';
 }
 return has('degreeContext',body)?'adjacent':null;
}

export function sociologyRecord(row,rules){
 const title=plain(row.title),description=plain(row.description||'');
 const type=sociologyRelevance(title,description,rules);if(!type)return null;
 const kind=opportunityKind(title,description,rules);
 if(!kind||!type||!/^https:\/\//.test(row.url||''))return null;
 if(deadlineTime(row.deadline)!==null&&deadlineTime(row.deadline)<Date.now())return null;
 const text=`${title} ${description}`;
 const explicitSeason=text.match(/\b(summer|spring|fall|winter)\s*2027\b/i);
 const season=row.season|| (explicitSeason?explicitSeason[1][0].toUpperCase()+explicitSeason[1].slice(1).toLowerCase()+' 2027':'Season not specified');
 const skillPatterns={
  'Research methods':/research|methodology|literature review|study design/i,
  'Data analysis':/data analysis|statistics|statistical|excel|\bSPSS\b|\bStata\b|\bR\b/i,
  'Survey design':/survey|qualtrics|questionnaire/i,
  'Interviewing':/interview|focus groups?|qualitative/i,
  'Program evaluation':/program evaluation|outcome measurement|impact evaluation/i,
  'Community outreach':/community|outreach|engagement/i,
  'Policy analysis':/policy|legislat|advocacy/i,
  'Writing':/writing|written|reports?|briefs?/i,
  'Communication':/communication|interpersonal|presentation/i,
  'Teamwork':/teamwork|collaborat|team player/i,
  'Documentation':/documentation|case notes|records/i
 };
 return {...row,datePosted:row.datePosted||row.date||null,id:postingKey(row.url),title,description:description.slice(0,12000),org:plain(row.org||row.company),location:plain(row.location),type,opportunityKind:kind,careerPath:careerPath(title,rules),season,skills:Object.entries(skillPatterns).filter(([,pattern])=>pattern.test(text)).map(([label])=>label),verification:row.verification||'employer-api'};
}

export function sociologyFeed(rows,rules,metadata={}){
 const keyed=new Map();
 for(const row of rows){const candidate=sociologyRecord(row,rules);if(!candidate)continue;const old=keyed.get(candidate.id);if(old&&old.verification!=='community-index'&&candidate.verification==='community-index')continue;keyed.set(candidate.id,candidate);}
 const roles=[...keyed.values()].sort((a,b)=>(a.opportunityKind==='internship'?0:1)-(b.opportunityKind==='internship'?0:1)||(a.season==='Summer 2027'?0:1)-(b.season==='Summer 2027'?0:1)||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
 const internships=roles.filter(r=>r.opportunityKind==='internship');
 return {...metadata,discipline:'sociology',total:roles.length,roles,counts:{internships:internships.length,focused:internships.filter(r=>r.careerPath!=='Broader management / leadership').length,broaderManagement:internships.filter(r=>r.careerPath==='Broader management / leadership').length,employerFeedInternships:internships.filter(r=>r.verification!=='community-index').length,communityInternshipCandidates:internships.filter(r=>r.verification==='community-index').length,entryLevel:roles.filter(r=>r.opportunityKind==='entry-level').length}};
}
