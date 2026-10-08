import assert from "node:assert/strict";
import {familyContactSettings} from "../lib/intelligence/family-contact";

const off=familyContactSettings({});
assert.equal(off.published,false);
assert.equal(off.phoneHref,null);
assert.equal(off.secureIntakeHref,null);
const staged=familyContactSettings({
  NEXT_PUBLIC_AGENCY_PHONE:"(303) 555-0144",
  NEXT_PUBLIC_SECURE_INTAKE_URL:"https://forms.example.org/secure?child=John&diagnosis=private#family",
});
assert.equal(staged.published,false,"Contact must never be advertised before explicit owner activation");
const active=familyContactSettings({
  NEXT_PUBLIC_INTAKE_PUBLISHED:"true",
  NEXT_PUBLIC_AGENCY_PHONE:"(303) 555-0144",
  NEXT_PUBLIC_SECURE_INTAKE_URL:"https://forms.example.org/secure?child=John&diagnosis=private#family",
});
assert.equal(active.published,true);
assert.equal(active.phoneHref,"tel:+13035550144");
assert.equal(active.displayPhone,"(303) 555-0144");
assert.equal(active.secureIntakeHref,"https://forms.example.org/secure","Never propagate family PII through URL query");
const unsafe=familyContactSettings({
  NEXT_PUBLIC_INTAKE_PUBLISHED:"true",
  NEXT_PUBLIC_AGENCY_PHONE:"12345",
  NEXT_PUBLIC_SECURE_INTAKE_URL:"javascript:alert(1)",
});
assert.equal(unsafe.published,false);
assert.equal(unsafe.phoneHref,null);
assert.equal(unsafe.secureIntakeHref,null);
const local=familyContactSettings({NEXT_PUBLIC_INTAKE_PUBLISHED:"true",
  NEXT_PUBLIC_SECURE_INTAKE_URL:"https://localhost:3000/intake"});
assert.equal(local.published,false);
const auth=familyContactSettings({NEXT_PUBLIC_INTAKE_PUBLISHED:"true",
  NEXT_PUBLIC_SECURE_INTAKE_URL:"https://secret:password@forms.example.org/form"});
assert.equal(auth.published,false);
const onlyPhone=familyContactSettings({NEXT_PUBLIC_INTAKE_PUBLISHED:"true",
  NEXT_PUBLIC_AGENCY_PHONE:"+1 (816) 555-0123"});
assert.equal(onlyPhone.published,true);
assert.equal(onlyPhone.phoneHref,"tel:+18165550123");
console.log("Family contact configuration passed: explicit activation, no unverified phone, safe HTTPS, no URL PHI, no local or authenticated destinations.");
