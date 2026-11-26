"use client";

import { useEffect } from "react";

/**
 * On a phone the tab bars scroll sideways: the open tab is brought into view
 * (only along the bar, the page itself doesn't move).
 */
export function ActiveTabIntoView({ deps }: { deps: string }) {
  useEffect(() => {
    for (const nav of document.querySelectorAll<HTMLElement>("nav")) {
      if (nav.scrollWidth <= nav.clientWidth) continue;
      const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) continue;
      const navBox = nav.getBoundingClientRect();
      const box = active.getBoundingClientRect();
      if (box.left >= navBox.left && box.right <= navBox.right) continue;
      nav.scrollLeft += box.left + box.width / 2 - (navBox.left + navBox.width / 2);
    }
  }, [deps]);
  return null;
}
