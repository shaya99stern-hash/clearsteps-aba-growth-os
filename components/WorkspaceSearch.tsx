"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { navItems } from "./AppNav";

export function WorkspaceSearch() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const open = () => { setQuery(""); dialog.current?.showModal(); };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setQuery(""); dialog.current?.showModal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const items = navItems.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <button ref={trigger} type="button" className="topbarSearch" aria-label="Search your workspace" aria-haspopup="dialog" onClick={open}><Search size={15} aria-hidden="true" /><span>Search your workspace</span><kbd>⌘K</kbd></button>
    <dialog ref={dialog} className="workspaceSearchDialog" aria-label="Search workspace" onClose={() => trigger.current?.focus()} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="workspaceSearchBody">
        <div className="workspaceSearchInput"><Search size={18} aria-hidden="true" /><input type="search" aria-label="Search workspace pages" placeholder="Where would you like to go?" value={query} onChange={(event) => setQuery(event.target.value)} /><button type="button" aria-label="Close search" onClick={() => dialog.current?.close()}><X size={18} /></button></div>
        <nav aria-label="Search results">{items.map(({ href, label, icon: Icon }) => <Link href={href} key={href} onClick={() => dialog.current?.close()}><Icon size={16} aria-hidden="true" />{label}</Link>)}</nav>
        {!items.length && <p role="status">No pages found. Try Leads, Tasks, or Settings.</p>}
      </div>
    </dialog>
  </>;
}
