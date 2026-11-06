// Deterministic, local evidence checks. Unstated facts remain unknown.
export const normalizeText = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/[ \t]+/g, ' ').trim();
const escapeRE = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function skillEvidence(text, aliases) {
 const clean = normalizeText(text), found = {};
 for (const [skill, words] of Object.entries(aliases)) {
  const word = words.find(w => new RegExp(`\\b${escapeRE(w)}${/^(collaborat|communicat)$/.test(w)?'\\w*':'\\b'}`, 'i').test(clean));
  if (!word) continue;
  const match = clean.match(new RegExp(`\\b${escapeRE(word)}`, 'i'));
  found[skill.toLowerCase()] = clean.slice(Math.max(0, match.index - 55), match.index + word.length + 100).trim();
 }
 return found;
}
export function resumeFacts(text) {
 const clean=normalizeText(text), facts={};
 const gpa=clean.match(/\b(?:cumulative\s+)?GPA\s*[:=]?\s*([0-4](?:\.\d{1,3})?)\s*(?:\/\s*(4\.0)|\bout of\s+(4\.0))?/i);
 if(gpa && Number(gpa[1])<=4 && !/\s*\/\s*(?:5|10|100)/.test(clean.slice(gpa.index+gpa[0].length,gpa.index+gpa[0].length+10)))facts.gpa={value:gpa[1],evidence:gpa[0]};
 const major=clean.match(/\b(?:major(?:ing)?\s*(?:in|:)?\s*|(?:bachelor(?:'?s)?(?: of (?:arts|science))?|B\.?[AS]\.?)\s*(?:degree\s*)?(?:in\s+)?)(psychology|sociology)\b/i);
 if(major)facts.major={value:major[1].toLowerCase(),evidence:major[0]};
 return facts;
}
const monthNames='January February March April May June July August September October November December'.split(' ');
function requirementKind(s) {
 if(/\b(?:not required|no minimum|no prior|not necessary)\b/i.test(s))return 'unspecified';
 if(/\b(?:preferred|desirable|a plus|nice to have|ideally)\b/i.test(s))return 'preferred';
 if(/\b(?:required|requires?|must|minimum|at least|only open|open only|restricted to|limited to)\b/i.test(s))return 'required';
 return 'unspecified';
}
function statements(text) {
 // Do not split decimal GPAs or abbreviations into unrelated fragments.
 return normalizeText(text).split(/\n+|(?<=[.!?;])\s+|[•●▪]/).map(s=>s.trim()).filter(Boolean);
}
const areaPatterns={
 major:/\b(?:majors?|degrees?|pursuing|enrolled|bachelor|undergraduate|graduate student)\b/i,
 gpa:/\bGPA\b|grade point average/i,
 graduation:/\bgraduat(?:ion|ing|e)\b[^.;]{0,100}\b20\d{2}\b|\b20\d{2}\b[^.;]{0,60}\bgraduat/i,
 enrollment:/\b(?:currently enrolled|must be enrolled|enrolled in|current undergraduate|current student|undergraduate students? only)\b/i,
 school:/\b(?:only open to|open only to|restricted to|limited to|must be enrolled at|must be a student at)\b/i,
 availability:/\b(?:available|availability|commit|work|hours|full.time)\b[^.;]{0,90}(?:summer|per week|weekly|June|July|August|May|2027)/i,
 experience:/\b(?:experience|years? of|prior research)\b/i,
 certification:/\b(?:certifi(?:ed|cation)|\bCPR\b|\bBLS\b|\bRBT\b|licen[cs]e)\b/i
};
function cleanFact(profile,facts,key) {
 const supplied=profile[key];
 if(supplied!==undefined&&supplied!=='')return {value:String(supplied),evidence:`Your confirmed profile: ${key} — ${supplied}${facts[key]?.value===String(supplied)?'; resume excerpt: '+facts[key].evidence:''}`};
 return null;
}
export function assessRole(role,{text='',profile={},skills={}}={}) {
 const facts=resumeFacts(text), checks=[], description=normalizeText(role.description||''), pieces=statements(role.description||'');
 const add=(area,requirement,kind,status='unknown',evidence='',note='')=>checks.push({area,requirement,kind,status,evidence,note});
 for(const [area,pattern] of Object.entries(areaPatterns)) {
  for(const full of pieces.filter(s=>pattern.test(s)).slice(0,3)) {
   const truncated=full.length>650,match=full.match(pattern),start=truncated?Math.max(0,match.index-160):0;
   const s=truncated?(start?'… ':'')+full.slice(start,start+650)+' …':full;
   const kind=requirementKind(s); let status='unknown',evidence='',note='Confirm this requirement in the full employer posting.';
   const simple=!/\b(?:or|unless|except|alternatively|not|no|without|cannot)\b/i.test(s.replace(/or higher/gi,''));
   if(area==='gpa') {
    const min=s.match(/(?:minimum(?:\s+(?:cumulative\s+)?GPA)?(?:\s+of)?|at least|GPA(?:\s+of)?(?:\s*[:=])?)\s*([0-4]\.\d{1,3})|([0-4]\.\d{1,3})\s*(?:GPA|or higher|minimum)/i);
    const gpa=cleanFact(profile,facts,'gpa');
    if(min&&gpa&&Number(gpa.value)>=0&&Number(gpa.value)<=4&&simple&&!/maximum|at most|below|less than|weighted|5\.0|10\.0|100.point/i.test(s)) {status=Number(gpa.value)>=Number(min[1]||min[2])?'met':'gap';evidence=gpa.evidence;note='Compared on a 4.0 scale.';}
   } else if(area==='major') {
    const major=cleanFact(profile,facts,'major');
    const acceptable=/all majors|any major|any field of study/i.test(s);
    const degreeComplete=/(?:completed|hold|possess|earned)[^.;]{0,40}(?:bachelor|degree)|(?:bachelor.?s|degree)[^.;]{0,25}(?:completed|required)/i.test(s)&&!/pursuing|enrolled|working toward/i.test(s);
    if(major&&!degreeComplete&&!/\b(?:not|no|without|cannot|master|doctoral|graduate|PhD)\b/i.test(s)) {
     evidence=major.evidence;
     if(acceptable||new RegExp(`\\b${escapeRE(major.value)}\\b`,'i').test(s)) {status='met';note='Major is named in the available description; other education conditions may still apply.';}
     else note='Your major is not explicitly named here. Related-field acceptance needs employer confirmation.';
    }
    if(/\b(?:and|with)\b[^.;]{0,60}(?:coursework|GPA|experience|certifi)|\b(?:junior|senior|sophomore|freshman)\b/i.test(s)) {status='unknown';note='This education statement includes additional conditions; review them together.';}
   } else if(area==='enrollment') {
    const enrolled=profile.enrollment;
    if(enrolled&&simple) {status=enrolled==='enrolled'?'met':'gap';evidence=`Your confirmed profile: ${enrolled==='enrolled'?'Currently enrolled':'Not currently enrolled'}`;note='Enrollment only; confirm degree level and school-year requirements separately.';}
    if(/graduate|master|doctoral|junior|senior|sophomore|freshman|full.time|accredited/i.test(s))status='unknown';
   } else if(area==='graduation') {
    const expected=profile.graduation;
    const dates=[...s.matchAll(new RegExp(`(${monthNames.join('|')})\\s+(20\\d{2})`,'gi'))].map(m=>`${m[2]}-${String(monthNames.findIndex(n=>n.toLowerCase()===m[1].toLowerCase())+1).padStart(2,'0')}`);
    if(expected&&simple&&dates.length===2&&/between|through|\bto\b/i.test(s)&&!/before|after|no later|no earlier/i.test(s)) {status=expected>=dates[0]&&expected<=dates[1]?'met':'gap';evidence=`Your confirmed expected graduation: ${expected}`;note='Compared with the stated graduation-month window.';}
   } else if(area==='certification') {
    const certs=['CPR','BLS','RBT'].filter(c=>new RegExp(`\\b${c}\\b`,'i').test(s));
    if(certs.length&&profile.certifications&&kind!=='unspecified'&&!/obtain|within|after|provided|training|willing/i.test(s)&&simple) {
     const yours=profile.certifications.toLowerCase();
     if(certs.every(c=>new RegExp(`\\b${c}\\b`,'i').test(yours))){status='met';evidence=`Your confirmed current certifications: ${profile.certifications}`;note='Confirm validity dates and accepted issuing organization.';}
     else if(/^none$/i.test(profile.certifications.trim())) {status='gap';evidence='You confirmed no current certifications.';note='The posting names a certification you do not currently hold.';}
    }
   }
   // Never equate a keyword or unrelated years of experience with fulfilling a requirement.
   if(area==='experience') {note='Check the required type and duration of experience. Resume keywords do not establish this.';const match=normalizeText(text).match(/[^.!?\n]{0,60}\b(?:research assistant|volunteer|internship|experience)\b[^.!?\n]{0,120}/i);if(match)evidence=`Resume excerpt (not verified duration): ${match[0]}`;}
   if(area==='availability'&&profile.availability) {evidence=`Your stated availability: ${profile.availability}`;note='Compare dates, weekly hours and location with the employer. This is not automatically inferred.';}
   if(area==='school'&&profile.school) {evidence=`Your confirmed school: ${profile.school}`;note='Check whether external students are accepted; a school name alone does not establish access.';}
   if(status!=='unknown' && /\b(?:unless|except|alternatively)\b/i.test(s)){status='unknown';note='This statement includes exceptions; confirm the full condition with the employer.';}
   if(truncated){status='unknown';note='Excerpt from a longer statement. Review the complete qualifications in the employer posting.';}
   add(area,s,kind,status,evidence,note);
  }
 }
 for(const skill of role.skills||[]) {
  const evidence=skills[skill.toLowerCase()];
  add('skill',skill,'skill',evidence?'met':'unknown',evidence?`Resume excerpt: ${evidence}`:'',evidence?'Keyword evidence only; depth of experience is not assessed.':'Not found in the resume. This does not establish a missing qualification.');
 }
 const requiredGaps=checks.filter(c=>c.kind==='required'&&c.status==='gap').length;
 const requiredMet=checks.filter(c=>c.kind==='required'&&c.status==='met').length;
 const unknown=checks.filter(c=>c.status==='unknown').length;
 return {checks,requiredGaps,requiredMet,unknown,summary:requiredGaps?'Potential requirement gaps': 'Review requirements',incomplete:!description||role.verification==='community-index',noRequirements:!checks.some(c=>c.kind==='required')};
}
