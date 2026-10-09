/**
 * Conservative publisher identity. Subdomains do not independently corroborate.
 * No personal or residential content is ever retained here.
 */
export function publicPublisherId(domain: string): string {
  const host=domain.toLowerCase().trim().replace(/^www\./,"").replace(/\.$/,"");
  if (!/^[a-z0-9.-]+$/.test(host)) return "";
  // Two public domains belonging to the same publisher do not corroborate each other.
  if (host === "nschdata.org") return "childhealthdata.org";
  if (host === "kschildrenscabinet.gov") return "ks.gov";
  const parts=host.split(".").filter(Boolean);
  if(parts.length<2) return "";
  const special=[
    "co.uk","org.uk","gov.uk","ac.uk","com.au","org.au","co.nz","com.br","co.jp",
    "k12.mo.us","k12.ks.us","k12.co.us","state.co.us","state.mo.us","state.ks.us",
  ];
  const suffix=special.find((value)=>host.endsWith("."+value));
  return parts.slice(-(suffix?suffix.split(".").length+1:2)).join(".");
}
export function normalizedPublicNarrative(text:string):string {
  return text.toLowerCase()
    .replace(/https?:\/\/\S+/g," ")
    .replace(/\b(?:copyright|all rights reserved|read more|click here)\b/g," ")
    .replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim().slice(0,1500);
}
export function samePublicNarrative(first:string,second:string) {
  const a=normalizedPublicNarrative(first),b=normalizedPublicNarrative(second);
  if(!a||!b) return false;
  if(a===b) return true;
  const aa=new Set(a.split(" ").filter((word)=>word.length>2));
  const bb=new Set(b.split(" ").filter((word)=>word.length>2));
  if(aa.size<9||bb.size<9) return false;
  const overlap=[...aa].filter((word)=>bb.has(word)).length;
  const union=new Set([...aa,...bb]).size;
  return union>0&&overlap/union>=0.91;
}
const STATE_NAME:Record<string,string>={MO:"Missouri",KS:"Kansas",CO:"Colorado"};
const STATE_CODE:Record<string,string>={Missouri:"MO",Kansas:"KS",Colorado:"CO"};
const expression=(value:string)=>value.replace(/[^a-zA-Z0-9]/g,(char)=>"\\"+char);
export function matchesPublishedArea(text:string,targetLocation:string) {
  const place=targetLocation.trim();
  if(!place) return true;
  const stateMatch=place.match(/(?:^|,|\s)(MO|KS|CO|Missouri|Kansas|Colorado)\s*$/i);
  const token=stateMatch?.[1]??"";
  const state=STATE_NAME[token.toUpperCase()]??token;
  const location=stateMatch?place.slice(0,stateMatch.index).trim().replace(/,+$/,"").trim():place;
  const statePattern=state?new RegExp("\\b("+expression(state)+"|"+expression(STATE_CODE[state]??state)+")\\b","i"):null;
  if(!location||/^statewide$/i.test(location))return statePattern?statePattern.test(text):true;
  const postal=location.match(/\b\d{5}\b/)?.[0];
  if(postal)return new RegExp("\\b"+postal+"\\b").test(text);
  const narrowed=location.replace(/\bcounty\b/gi,"").trim();
  if(!narrowed)return Boolean(statePattern?.test(text));
  const terms=narrowed.split(/\s+/).map((word)=>word.replace(/[^a-z0-9]/gi,"")).filter(Boolean);
  if(!terms.length)return false;
  const area=new RegExp("\\b"+terms.map(expression).join("\\s+")+"\\b","i");
  return area.test(text)&&(!statePattern||statePattern.test(text));
}
