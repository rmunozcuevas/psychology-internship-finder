import {readFile,writeFile} from 'node:fs/promises';
export async function refreshLocalPrograms() {
  const sources=JSON.parse(await readFile(new URL('../local-program-sources.json',import.meta.url),'utf8'));
  const programs=await Promise.all(sources.map(async source=>{
    try {
      const response=await fetch(source.url,{signal:AbortSignal.timeout(20000),headers:{'user-agent':'FieldnoteInternshipFinder/1.0'}});
      if(!response.ok)throw Error(`HTTP ${response.status}`);
      const page=(await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ');
      const index=page.toLowerCase().indexOf(source.section.toLowerCase());
      if(index<0)throw Error('Expected program section not found; manual review needed');
      const text=page.slice(index,index+5000);
      const paused=/applications?[^.]{0,80}(?:on hold|closed|not accepting)|unable to accept applications/i.test(text);
      return {...source,status:paused?'Applications paused or closed':'Inquire — Summer 2027 opening not confirmed',excerpt:text.slice(0,650),lastChecked:new Date().toISOString(),verifiedPage:true};
    } catch(error) {
      return {...source,status:'Page check failed — verify with program',error:error.message,verifiedPage:false,lastAttemptAt:new Date().toISOString()};
    }
  }));
  await writeFile(new URL('../local-programs.json',import.meta.url),JSON.stringify({updatedAt:new Date().toISOString(),programs},null,2)+'\n');
}
