"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, Plus, X } from "lucide-react";
import { navGroups } from "./AppNav";

export function MobileDrawer({ title }: { title: string }) {
  const pathname = usePathname();
  const [openedForPath, setOpenedForPath] = useState<string | null>(null);
  const open = openedForPath === pathname;
  const menuButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const firstLink = dialog.current?.querySelector<HTMLAnchorElement>("a[href]");
    firstLink?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpenedForPath(null);
        menuButton.current?.focus();
      }
      if (event.key !== "Tab" || !dialog.current) return;
      const focusable = [...dialog.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <header className="csMobileHeader">
        <button
          ref={menuButton}
          className="csMobileIconButton csMenuToggle"
          type="button"
          aria-label="Open navigation"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpenedForPath(pathname)}
        >
          <Menu size={19} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <Link href="/" className="csMobileIdentity" aria-label="Clear Steps home">
          <Image src="/api/app-icon" width={28} height={28} alt="" priority unoptimized />
          <span className="csMobileIdentityText">
            <strong>Clear Steps</strong>
            <small>{title}</small>
          </span>
        </Link>
        <Link href="/tasks" className="csMobileIconButton csNewTask" aria-label="Open tasks">
          <Plus size={19} strokeWidth={1.8} aria-hidden="true" />
        </Link>
      </header>
      {open && (
        <div className="csDrawerLayer">
          <button className="csDrawerScrim" type="button" aria-label="Close navigation" onClick={() => setOpenedForPath(null)} />
          <aside className="csDrawer" ref={dialog} role="dialog" aria-modal="true" aria-label="Workspace navigation">
            <header className="csDrawerHeading">
              <div className="csDrawerName">
                <span>WORKSPACE</span>
                <h2>Clear Steps</h2>
              </div>
              <button type="button" className="csMobileIconButton" aria-label="Close menu" onClick={() => { setOpenedForPath(null); menuButton.current?.focus(); }}>
                <X size={19} aria-hidden="true" />
              </button>
            </header>
            <nav aria-label="Mobile workspace">
              {navGroups.map((group) => (
                <section className="csDrawerGroup" key={group.label} aria-label={group.label}>
                  <h3>{group.label}</h3>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={active ? "csDrawerLink isActive" : "csDrawerLink"}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpenedForPath(null)}
                      >
                        <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
                        <span>{item.label}</span>
                        {active && <span className="csDrawerActiveMarker" aria-hidden="true" />}
                      </Link>
                    );
                  })}
                </section>
              ))}
            </nav>
            <footer className="csDrawerFooter">
              <span><i /> Missouri · Kansas · Colorado</span>
              <Link href="/connectors" onClick={() => setOpenedForPath(null)}>Source status <ArrowUpRight size={13} aria-hidden="true" /></Link>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
