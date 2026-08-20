import { useNavigate as useRouterNavigate, type NavigateOptions, type To } from 'react-router-dom'

/**
 * Drop-in replacement for react-router's `useNavigate` that defaults
 * `viewTransition` to on — the programmatic-navigation counterpart to
 * `Link`/`NavLink` in ./navigation.tsx. See that file for why.
 */
export function useNavigate() {
  const navigate = useRouterNavigate()
  return (to: To | number, options?: NavigateOptions) => {
    if (typeof to === 'number') {
      navigate(to)
      return
    }
    navigate(to, { viewTransition: true, ...options })
  }
}
