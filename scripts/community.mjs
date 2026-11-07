export const COMMUNITY_URL='https://raw.githubusercontent.com/KSaifStack/SearchTern-Listings/main/pages/searchtern.json';
export async function communityJobs(get){
 const rows=await get(COMMUNITY_URL);
 if(!Array.isArray(rows))throw Error('Unexpected community listing format');
 // U.S. roles only; community descriptions are not treated as employer-verified qualifications.
 return rows.filter(r=>r.country_iso==='US' && !['closed','expired','filled'].includes(String(r.status||'').toLowerCase()) && r.active!==false && r.observed_at && Date.parse(r.observed_at)>=Date.now()-14*86400000 && typeof r.link==='string' && /^https:\/\//.test(r.link)).map(r=>({title:r.role,company:/us-erac\.icims\.com/.test(r.link)&&/Enterprise Mobility/i.test(r.description||'')?'Enterprise Mobility':r.company,location:r.location,url:r.link,description:r.description||'',date:r.date,deadline:r.validThrough||r.deadline||null,source:'SearchTern community index',verification:'community-index',observedAt:r.observed_at}));
}
