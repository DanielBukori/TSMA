import { useEffect, useState } from "react";

export function scrollToSection(sectionId) {
  const id =
    typeof sectionId === "string"
      ? sectionId.replace(/^#/, "")
      : sectionId?.current?.id || sectionId?.id;

  if (!id) return;

  const element = document.getElementById(id);

  if (!element) {
    console.warn(`Section not found: ${id}`);
    return;
  }

  element.scrollIntoView({
    behavior: window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
      ? "auto"
      : "smooth",
    block: "start",
  });
}

export function useActiveSection(sectionIds = []) {
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    if (!sectionIds.length) return;

    const updateActiveSection = () => {
      let current = "";

      for (const item of sectionIds) {
        const id = typeof item === "string" ? item.replace(/^#/, "") : "";
        const element = id ? document.getElementById(id) : null;

        if (element && element.getBoundingClientRect().top <= 160) {
          current = id;
        }
      }

      if (current) setActiveSection(current);
    };

    window.addEventListener("scroll", updateActiveSection, {
      passive: true,
    });

    updateActiveSection();

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
    };
  }, [sectionIds]);

  return activeSection;
}