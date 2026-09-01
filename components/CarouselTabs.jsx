"use client";

import { useState } from "react";
import SimpleCarousel from "./SimpleCarousel";

// Two compositions of the same ring, switched by an icon toggle. Remounting on
// switch (via the `key`) replays the staggered card-in entry, so each
// orientation arrives rather than snapping in.
//
// The icons mirror the composition itself: a landscape card for horizontal, a
// portrait card for vertical.
const TABS = [
  {
    id: "horizontal",
    label: "横版布局",
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <rect x="2" y="5.5" width="16" height="9" rx="1.8" />
      </svg>
    ),
  },
  {
    id: "vertical",
    label: "竖版布局",
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <rect x="5.5" y="2" width="9" height="16" rx="1.8" />
      </svg>
    ),
  },
];

export default function CarouselTabs() {
  const [tab, setTab] = useState("horizontal");

  return (
    <>
      <nav className="carousel-tabs" role="tablist" aria-label="Carousel composition">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-label={t.label}
            title={t.label}
            className={`tab${tab === t.id ? " tab-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
          </button>
        ))}
      </nav>

      <SimpleCarousel key={tab} orientation={tab} />
    </>
  );
}
