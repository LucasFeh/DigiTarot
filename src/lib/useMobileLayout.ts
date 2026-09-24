import { useSyncExternalStore } from 'react'

const QUERY = '(max-width: 767px), (max-width: 1023px) and (hover: none) and (pointer: coarse)'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

export function useMobileLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
