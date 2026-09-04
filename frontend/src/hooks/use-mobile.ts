import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Écart assumé par rapport au fichier généré par shadcn : la version d'origine
// appelait setState directement dans un effet, ce que la règle
// `react-hooks/set-state-in-effect` rejette. Comportement identique.
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
