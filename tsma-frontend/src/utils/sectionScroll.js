import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SECTION_ROUTES, SINGLE_PAGE } from "../config/layout.js";

// The navbar pill is sticky, so a section's top edge has to clear it.
const SECTION_OFFSET = 96;

export function normalizeSection(value) {
  const raw =
    typeof value === "string"
      ? value
      : value?.current?.id || value?.id || "";

  // "#/about" is the legacy hash form of "/about".
  return raw.replace(/^#\/?/, "").split(/[/?#]/)[0];
}

export function scrollToSection(section) {
  const id = normalizeSection(section);
  if (!id) return false;

  const element = document.getElementById(id);
  if (!element) return false;

  const behavior = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches
    ? "auto"
    : "smooth";

  const top = Math.max(
    element.getBoundingClientRect().top + window.scrollY - SECTION_OFFSET,
    0
  );

  window.scrollTo({ top, behavior });
  return true;
}

/** Scrolls once the section exists; single-page sections mount after data loads. */
export function scrollToSectionWhenReady(section, { maxWait = 5000 } = {}) {
  const id = normalizeSection(section);
  if (!id) return () => {};

  let frame = 0;
  let stopped = false;
  const deadline = Date.now() + maxWait;

  function stop() {
    stopped = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function step() {
    if (stopped) return;
    if (scrollToSection(id) || Date.now() >= deadline) {
      stop();
      return;
    }
    frame = requestAnimationFrame(step);
  }

  step();
  return stop;
}

export function useSectionNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const cancelPendingScroll = useRef(null);

  useEffect(() => () => cancelPendingScroll.current?.(), []);

  return useCallback(
    (section) => {
      const id = normalizeSection(section);
      if (!id) return false;

      if (!SINGLE_PAGE) {
        navigate(SECTION_ROUTES[id] || "/", { replace: false });
        return true;
      }

      if (location.pathname !== "/") {
        navigate({ pathname: "/", hash: `#${id}` }, { replace: false });
        return true;
      }

      // replaceState avoids a Home re-render; reusing history.state keeps router back/forward intact.
      if (location.hash !== `#${id}`) {
        window.history.replaceState(window.history.state, "", `#${id}`);
      }

      cancelPendingScroll.current?.();
      cancelPendingScroll.current = scrollToSectionWhenReady(id);
      return true;
    },
    [location.hash, location.pathname, navigate]
  );
}

/** Deep links: "/" opened with "#publications" (or legacy "#/publications"). */
export function useHashSectionScroll() {
  const { hash } = useLocation();

  useEffect(() => {
    const id = normalizeSection(hash);
    if (!id) return;
    return scrollToSectionWhenReady(id, { maxWait: 8000 });
  }, [hash]);
}

export function useActiveSection(sectionIds = [], enabled = true) {
  const [activeSection, setActiveSection] = useState("");
  const key = enabled ? sectionIds.map(normalizeSection).filter(Boolean).join(",") : "";

  useEffect(() => {
    if (!key) {
      setActiveSection("");
      return;
    }

    const ids = key.split(",");

    const updateActiveSection = () => {
      let current = "";

      for (const id of ids) {
        const element = document.getElementById(id);

        if (element && element.getBoundingClientRect().top <= SECTION_OFFSET + 64) {
          current = id;
        }
      }

      setActiveSection(current);
    };

    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection, { passive: true });

    updateActiveSection();

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [key]);

  return activeSection;
}
