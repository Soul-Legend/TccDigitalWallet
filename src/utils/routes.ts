/**
 * Centralised route table for the digital wallet app.
 *
 * Single source of truth for both:
 *   - file-based routes under `app/` (each route value MUST match a file there)
 *   - imperative navigation via `useRouter().push(Routes.X)`
 *
 * Adding a new route requires:
 *   1) add an entry here,
 *   2) create the matching `app/<slug>.tsx` shim,
 *   3) the navigation contract test under
 *      `src/screens/__tests__/HomeScreen.navigation.test.tsx` will assert the
 *      `app/` directory contains a file for every route value.
 */
export const Routes = {
  Initialization: '/',
  Home: '/home',
  Emissor: '/emissor',
  Titular: '/titular',
  Verificador: '/verificador',
  Logs: '/logs',
  Glossario: '/glossario',
  Diagnosticos: '/diagnosticos',
} as const;

export type RouteName = keyof typeof Routes;
export type RoutePath = (typeof Routes)[RouteName];

/** Map a legacy route name (e.g. "Emissor") to its new path ("/emissor"). */
export function routeFor(name: RouteName): RoutePath {
  return Routes[name];
}
