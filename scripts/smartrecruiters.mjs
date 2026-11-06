export async function smartRecruiterJobs(company,get,relevant) {
  const base=`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings`;
  const candidates=[]; let scanned=0;
  for(let offset=0;offset<5000;offset+=100){
    const data=await get(`${base}?q=intern&country=us&limit=100&offset=${offset}`);
    const page=data.content||[];scanned+=page.length;
    candidates.push(...page.filter(j=>relevant(j.name)));
    if(page.length<100||offset+page.length>=data.totalFound)break;
  }
  const jobs=[],errors=[];let next=0;
  await Promise.all(Array.from({length:4},async()=>{
    while(next<candidates.length){const j=candidates[next++];try{
      const d=await get(`${base}/${j.id}`);
      const description=Object.values(d.jobAd?.sections||{}).map(s=>`${s.title||''} ${s.text||''}`).join(' ');
      jobs.push({title:d.name||j.name,company:d.company?.name||company,location:[d.location?.city,d.location?.region,d.location?.country].filter(Boolean).join(', '),url:d.applyUrl||`https://jobs.smartrecruiters.com/${company}/${j.id}`,description,date:d.releasedDate,source:'SmartRecruiters'});
    }catch(e){errors.push(`${company} ${j.name}: ${e.message}`)}}
  }));
  return {jobs,errors,scanned};
}
