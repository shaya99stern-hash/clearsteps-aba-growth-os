export interface FamilyContactSettings {
  phoneHref:string|null;
  displayPhone:string|null;
  secureIntakeHref:string|null;
  published:boolean;
}
/**
 * This page has ZERO patient forms, no behavioral health details in the URL,
 * no analytics and no browser-side storage. Agency contact is configured by the owner.
 */
export function familyContactSettings(env:Record<string,string|undefined>):FamilyContactSettings {
  const published=env.NEXT_PUBLIC_INTAKE_PUBLISHED==="true";
  const raw=env.NEXT_PUBLIC_AGENCY_PHONE?.trim()??"";
  const digits=raw.replace(/\D/g,"");
  const us=digits.length===10?digits:digits.length===11&&digits.startsWith("1")?digits.slice(1):null;
  const phoneHref=us?"tel:+1"+us:null;
  const displayPhone=us?"("+us.slice(0,3)+") "+us.slice(3,6)+"-"+us.slice(6):null;
  let secureIntakeHref:string|null=null;
  const source=env.NEXT_PUBLIC_SECURE_INTAKE_URL?.trim();
  if(source)try{
    const url=new URL(source);
    if(url.protocol==="https:"&&!url.username&&!url.password&&
      url.hostname&&!["localhost","127.0.0.1"].includes(url.hostname.toLowerCase())) {
      // Never append or forward child, diagnosis, age or contact information in a URL.
      url.search="";
      url.hash="";
      secureIntakeHref=url.toString();
    }
  }catch{/* Invalid URL is unavailable, not silently converted into an unsafe link. */}
  return {phoneHref,displayPhone,secureIntakeHref,published:published&&Boolean(phoneHref||secureIntakeHref)};
}
