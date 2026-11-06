// Public employer postings only. Full descriptions are required for eligibility screening.
export async function workdayJobs(raw, get, relevant) {
  const [host, tenant, site] = raw.split('|');
  if (!host?.endsWith('.myworkdayjobs.com') || !tenant || !site) throw Error('Invalid Workday board');
  const base = `https://${host}/wday/cxs/${tenant}/${site}`;
  const postings = [];
  let total=null;
  for (let offset=0; offset<5000; offset+=20) {
    const data=await get(`${base}/jobs`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({limit:20,offset,searchText:'intern'})});
    if(total===null && data.total>0) total=data.total;
    const page=data.jobPostings||[];
    postings.push(...page);
    if (!page.length || (total!==null && offset+page.length >= total) || page.length<20) break;
  }
  const candidates=postings.filter(j=>relevant(j.title));
  const jobs=[], errors=[];
  let next=0;
  await Promise.all(Array.from({length:4},async()=>{
    while(next<candidates.length) {
      const j=candidates[next++];
      try {
        const detail=await get(`${base}${j.externalPath}`);
        const info=detail.jobPostingInfo;
        if(!info || info.canApply===false || info.posted===false) continue;
        if(info.endDate && Date.parse(info.endDate+'T23:59:59Z')<Date.now()) continue;
        jobs.push({title:info.title,location:info.location||j.locationsText||'',url:info.externalUrl||`https://${host}/en-US/${site}${j.externalPath}`,description:info.jobDescription||'',date:info.startDate,deadline:info.endDate||null,source:'Workday'});
      } catch(e) { errors.push(`${j.title}: ${e.message}`); }
    }
  }));
  return {jobs, errors, scanned:postings.length};
}
