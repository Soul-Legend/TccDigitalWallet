/**
 * HomeScreen navigation contract — static smoke test
 *
 * We don't render the screen (no react-native-testing-library is configured,
 * and mocking the entire RN bridge for a navigation contract is overkill).
 * Instead we statically read the HomeScreen source and assert that every
 * `route:` literal maps to a valid entry in the shared file-based route table.
 *
 * This is a structural regression net: if someone renames a navigator route
 * or mistypes a destination in HomeScreen, this test fails immediately with a
 * clear message — without booting React.
 */

import {readFileSync, readdirSync, existsSync} from 'fs';
import {join} from 'path';
import {Routes, type RouteName} from '../../utils/routes';

const HOME_SCREEN_PATH = join(__dirname, '..', 'HomeScreen.tsx');
const APP_DIR = join(__dirname, '..', '..', '..', 'app');

const KNOWN_ROUTES: ReadonlyArray<RouteName> = Object.keys(Routes) as RouteName[];
const KNOWN_PATHS = new Set<string>(Object.values(Routes));

/**
 * Collect all .tsx basenames from the app dir, including layout groups like (tabs).
 */
function collectAppFiles(dir: string): string[] {
  const entries = readdirSync(dir, {withFileTypes: true});
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.tsx')) {
      files.push(entry.name);
    } else if (entry.isDirectory()) {
      files.push(...collectAppFiles(join(dir, entry.name)));
    }
  }
  return files;
}

describe('HomeScreen — navigation contract', () => {
  let source: string;
  let appFiles: string[];

  beforeAll(() => {
    source = readFileSync(HOME_SCREEN_PATH, 'utf8');
    appFiles = collectAppFiles(APP_DIR);
  });

  it('declares only route names that exist in shared routes map', () => {
    // Match every `route: 'X' as const` literal in the module list.
    const routeLiteralRegex = /route:\s*'([A-Za-z]+)'\s+as\s+const/g;
    const referenced = new Set<string>();
    for (const match of source.matchAll(routeLiteralRegex)) {
      referenced.add(match[1]);
    }

    expect(referenced.size).toBeGreaterThan(0);
    for (const route of referenced) {
      expect(KNOWN_ROUTES).toContain(route as RouteName);
    }
  });

  it('every shared route path has a matching app route file', () => {
    const appBasenames = new Set(appFiles.map(file => file.replace(/\.tsx$/, '')));
    for (const path of Object.values(Routes)) {
      const expectedFile = path === '/' ? 'index' : path.slice(1);
      expect(appBasenames).toContain(expectedFile);
    }
  });

  it('home module paths point to known shared route paths', () => {
    // Match every `path: Routes.X` entry in HomeScreen modules list.
    const routePathRefRegex = /path:\s*Routes\.([A-Za-z]+)/g;
    const referencedPaths = Array.from(source.matchAll(routePathRefRegex)).map(
      m => Routes[m[1] as RouteName],
    );

    expect(referencedPaths.length).toBeGreaterThan(0);
    for (const path of referencedPaths) {
      expect(KNOWN_PATHS.has(path)).toBe(true);
    }
  });

  it('uses expo-router push (no legacy navigation prop calls)', () => {
    expect(source).toMatch(/router\.push\(module\.path\)/);
    expect(source).not.toMatch(/navigation\.navigate\(/);
    // Forbid raw deep-linking from the home tile handler:
    expect(source).not.toMatch(/Linking\.openURL/);
  });
});
