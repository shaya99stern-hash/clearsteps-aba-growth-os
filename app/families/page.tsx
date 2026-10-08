import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck2, HeartHandshake, MapPin, Phone, ShieldCheck } from "lucide-react";
import { familyContactSettings } from "@/lib/intelligence/family-contact";
import styles from "./families.module.css";

const settings=familyContactSettings(process.env);

export const metadata: Metadata = {
  title:"Request ABA Services",
  description:"Learn how to contact Clear Steps ABA about age-appropriate ABA services, service areas and intake eligibility.",
  robots:{index:settings.published,follow:settings.published},
};

export default function FamiliesPage() {
  return (
    <main className={styles.page}>
      <a className={styles.skip} href="#family-main">Skip to services</a>
      <header className={styles.header}>
        <div className={styles.brand}><span className={styles.mark}>CS</span><span>Clear Steps <b>ABA</b></span></div>
        <span className={styles.privacy}><ShieldCheck size={15} aria-hidden="true"/> Private by design</span>
      </header>
      <div id="family-main" className={styles.body}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>FOR PARENTS &amp; CAREGIVERS</p>
            <h1>Find the next step toward ABA support.</h1>
            <p className={styles.lede}>Ask about services for children and teens ages 2–18. Our intake process begins by confirming your location, eligibility, service availability and appropriate clinical staffing.</p>
            {settings.published ? (
              <div className={styles.actions}>
                {settings.secureIntakeHref && (
                  <a className={styles.primary} href={settings.secureIntakeHref} target="_blank" rel="noopener noreferrer">
                    Request an intake conversation <ArrowRight size={18} aria-hidden="true"/>
                  </a>
                )}
                {settings.phoneHref && <a className={styles.secondary} href={settings.phoneHref}><Phone size={18} aria-hidden="true"/> Call {settings.displayPhone}</a>}
              </div>
            ) : (
              <div className={styles.notConfigured} role="status">
                <ShieldCheck size={20} aria-hidden="true"/>
                <div><strong>Intake contact is not yet activated.</strong><p>This page does not accept or store inquiries until the agency connects and verifies its official contact destination. Please do not enter personal or medical information here.</p></div>
              </div>
            )}
            <p className={styles.disclaimer}>An inquiry does not guarantee acceptance, insurance coverage, staff availability or a specific treatment plan.</p>
          </div>
          <div className={styles.sideCard}>
            <p className={styles.cardLabel}>A clearer beginning</p>
            <h2>What to expect</h2>
            <div className={styles.feature}><Phone size={20} aria-hidden="true"/><div><strong>Speak with an intake coordinator</strong><p>Ask about service locations and whether the agency is accepting inquiries.</p></div></div>
            <div className={styles.feature}><MapPinCheckInside size={20} aria-hidden="true"/><div><strong>Confirm the practical details</strong><p>Review the service area, payers and assessment process with the team.</p></div></div>
            <div className={styles.feature}><CalendarCheck2 size={20} aria-hidden="true"/><div><strong>Discuss scheduling and staffing</strong><p>Any services require an appropriate care plan and qualified clinical supervision.</p></div></div>
          </div>
        </section>
        <section className={styles.bands} aria-label="Age groups">
          <div><span className={styles.eyebrow}>SERVICE INQUIRIES</span><h2>Support changes as children grow.</h2><p>These age ranges help route an inquiry; they do not establish a diagnosis, eligibility or a guarantee of availability.</p></div>
          <div className={styles.bandCards}>
            <article><span>02 — 05</span><h3>Early childhood</h3><p>Ask about early-childhood service options and assessment requirements.</p></article>
            <article><span>06 — 11</span><h3>School age</h3><p>Discuss schedules, learning environments and family goals.</p></article>
            <article><span>12 — 18</span><h3>Adolescents</h3><p>Ask whether developmentally appropriate services are available.</p></article>
          </div>
        </section>
        <footer className={styles.footer}>
          <span><HeartHandshake size={16} aria-hidden="true"/> Clear Steps ABA</span>
          <p>No family contact, diagnoses or medical histories are collected on this page.</p>
          <Link href="/">Agency workspace</Link>
        </footer>
      </div>
    </main>
  );
}