const DAY=86400000;
export function deadlineTime(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}/.test(value))return null;
 const day=value.slice(0,10),calendar=new Date(day+'T12:00:00Z');
 if(!Number.isFinite(calendar.getTime())||calendar.toISOString().slice(0,10)!==day)return null;
 const date=Date.parse(value.length===10?value+'T23:59:59.999-12:00':value);
 return Number.isFinite(date)?date:null;
}
export function listingStatus(role,now=Date.now()){
 const deadline=deadlineTime(role.deadline||role.validThrough||role.listingCheck?.validThrough);
 if(role.listingCheck?.state==='closed'||(deadline!==null&&deadline<now))return {state:'closed',label:'Closed / expired',reason:role.listingCheck?.reason||'Application deadline has passed'};
 const checked=Date.parse(role.listingCheck?.checkedAt||''),seen=Date.parse(role.lastSeen||role.last_seen_at||'');
 if(role.listingCheck?.state==='present'&&now-checked<3*DAY)return {state:'current',label:'Posting page found',reason:'A matching JobPosting was found on the source page. Confirm availability with the employer.'};
 if(role.verification==='community-index')return {state:'review',label:'Community candidate',reason:'Community observation is not an employer confirmation. Review the original posting.'};
 if(Number.isFinite(seen)&&now-seen<=3*DAY&&now-seen>=-DAY)return {state:'current',label:'Seen in employer feed',reason:'Returned by the employer feed recently. This does not establish personal eligibility.'};
 return {state:'stale',label:'Recheck availability',reason:'No employer-feed observation within the past 72 hours. The posting may have changed.'};
}
export function studentEligibilityNotes(title,description=''){
 const text=`${title} ${description}`,notes=[];
 if(/\bundergraduate|bachelor[^.;]{0,45}(?:pursuing|enrolled)|(?:pursuing|enrolled)[^.;]{0,65}bachelor/i.test(text))notes.push('Undergraduate study mentioned');
 else notes.push('Undergraduate eligibility needs confirmation');
 if(/\b(junior|senior|sophomore|freshman|rising senior|rising junior)\b/i.test(description))notes.push('School-year restriction: review posting');
 if(/\bGPA\b|grade point average/i.test(description))notes.push('GPA condition: review posting');
 if(/\b(?:CPR|BLS|RBT|certifi(?:cation|ed)|licen[cs]e)\b/i.test(description))notes.push('Credential condition: review posting');
 if(/(?:US|U\.S\.|United States) citizen|work authori[sz]ation|sponsorship|security clearance/i.test(description))notes.push('Work authorization / clearance condition');
 if(/academic credit|course credit|field placement|practicum|partner (?:school|institution)/i.test(description))notes.push('Credit / school-placement condition');
 return notes;
}
export function feedCounts(roles){
 const internships=roles.filter(r=>r.opportunityKind==='internship');
 return {internships:internships.length,focused:internships.filter(r=>r.careerPath!=='Broader management / leadership').length,broaderManagement:internships.filter(r=>r.careerPath==='Broader management / leadership').length,employerFeedInternships:internships.filter(r=>r.verification!=='community-index').length,communityInternshipCandidates:internships.filter(r=>r.verification==='community-index').length,entryLevel:roles.filter(r=>r.opportunityKind==='entry-level').length};
}
