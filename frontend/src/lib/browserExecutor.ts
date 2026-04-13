// src/lib/browserExecutor.ts
// Hybrid execution: real browser execution for JS/HTML/CSS/React/TS, remote for backend.
//
// FIXES in this version:
//  1. REACT_SHIM — injects all React hooks + createRoot as window globals BEFORE
//     user code runs. Fixes "useState is not defined", "createRoot is not defined", etc.
//  2. isReactFile() helper — detects React in .js/.ts files too, not just .tsx/.jsx.
//     Fixes bundleWebFiles falling through to buildJsHtml for React-in-JS output.
//  3. Removed `crossorigin` from CDN <script> tags — causes silent failures in
//     sandboxed iframes with null origin.
//  4. buildMountScript — now detects standalone createRoot(...).render() pattern
//     (from shim) so it doesn't double-mount.
//  5. cleanReactCode — broader import stripping regex covers all edge cases.
//  6. executeInBrowser — auto-detects React patterns in "javascript" language files.

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: string;
  isReal: boolean;
  language?: string;
}

// ─── Language routing ─────────────────────────────────────────────────────────
export const WEB_LANGUAGES = [
  "javascript", "html", "css", "typescript", "react", "jsx", "tsx",
];

export const BACKEND_LANGUAGES = [
  "python", "java", "node", "nodejs", "ruby", "go", "rust",
  "cpp", "c", "bash", "shell", "kotlin", "swift", "scala", "php", "r",
];

export function canExecuteLocally(language: string): boolean {
  return WEB_LANGUAGES.includes(language.toLowerCase());
}

// ─── Server-side file detection ───────────────────────────────────────────────
const SERVER_PATTERNS: RegExp[] = [
  /\brequire\s*\(\s*['"](?:express|mongoose|stripe|pg|mysql2?|redis|sequelize|knex|prisma|typeorm|dotenv|path|fs|http|https|crypto|os|child_process|cluster|net|tls|stream|zlib|buffer|util|events|assert|querystring|url)['"]\s*\)/,
  /\bimport\s+.*?\bfrom\s+['"](?:express|mongoose|stripe|pg|mysql2?|redis|sequelize|knex|prisma|typeorm|dotenv)['"]/,
  /\bmodule\.exports\s*=/,
  /\bprocess\.env\b/,
  /\bapp\.listen\s*\(/,
  /mongoose\.connect\s*\(/,
  /new\s+Schema\s*\(\s*\{/,
  /Router\s*\(\s*\)/,
  /\.findOne\s*\(|\.findById\s*\(|\.save\s*\(\s*\)/,
  /bcrypt\.hash|bcrypt\.compare/,
  /jwt\.sign|jwt\.verify/,
];

const SERVER_FILENAMES = new Set([
  "server.js", "server.ts", "app.js", "app.ts",
  "database.js", "database.ts", "db.js", "db.ts",
  "routes.js", "routes.ts", "middleware.js", "middleware.ts",
  "models.js", "models.ts", "config.js", "config.ts",
]);

export function isServerSideFile(file: { filename: string; code: string }): boolean {
  const base = file.filename.split("/").pop()?.toLowerCase() ?? "";
  if (SERVER_FILENAMES.has(base)) {
    if (base === "index.js" || base === "index.ts") {
      return SERVER_PATTERNS.some((p) => p.test(file.code));
    }
    return true;
  }
  return SERVER_PATTERNS.some((p) => p.test(file.code));
}

// ─── React file detector ──────────────────────────────────────────────────────
// FIX: the old code only checked language === "react" or .tsx/.jsx extension.
// LLMs frequently output React code in .js or .ts files. This helper catches all cases.
export function isReactFile(f: { filename: string; language: string; code: string }): boolean {
  if (f.language === "react") return true;
  const fname = (f.filename.split("/").pop() ?? "").toLowerCase();
  if (fname.endsWith(".tsx") || fname.endsWith(".jsx")) return true;
  // Detect React in plain JS/TS files by checking for JSX usage + React API calls
  if (["javascript", "typescript"].includes(f.language.toLowerCase())) {
    const hasReactRef = /\b(?:React|useState|useEffect|useCallback|useMemo|useRef|createContext|ReactDOM)\b/.test(f.code);
    const hasJsx = /<[A-Z][A-Za-z0-9]*[\s/>]|<\/[A-Z][A-Za-z0-9]*>|return\s*\(\s*</.test(f.code);
    return hasReactRef && hasJsx;
  }
  return false;
}

// ─── postMessage bridge (injected into every iframe) ─────────────────────────
const BRIDGE_SCRIPT = `(function(){
  var _p=window.parent;
  var _fmt=function(a){return Array.prototype.slice.call(a).map(function(x){return typeof x==='object'?JSON.stringify(x,null,2):String(x);}).join(' ');};
  var _ol=console.log,_ow=console.warn,_oi=console.info,_oe=console.error;
  console.log  =function(){var s=_fmt(arguments);_p.postMessage({type:'log',  data:s},'*');_ol.apply(console,arguments);};
  console.warn =function(){var s=_fmt(arguments);_p.postMessage({type:'log',  data:'warning: '+s},'*');_ow.apply(console,arguments);};
  console.info =function(){var s=_fmt(arguments);_p.postMessage({type:'log',  data:s},'*');_oi.apply(console,arguments);};
  console.error=function(){var s=_fmt(arguments);_p.postMessage({type:'error',data:s},'*');_oe.apply(console,arguments);};
  window.onerror=function(_m,_s,_l,_c,e){_p.postMessage({type:'error',data:e?e.message:_m},'*');return true;};
})();`;

// ─── React global shim ────────────────────────────────────────────────────────
// FIX (critical): LLM code uses `import { useState } from 'react'` which we strip.
// But then the code calls `useState(...)` and it's undefined. This shim exposes
// every React API as a window global so they work without imports.
// Also exposes createRoot/hydrateRoot so named-import patterns work after stripping.
const REACT_SHIM = `
(function() {
  var R = window.React;
  var RD = window.ReactDOM;
  if (!R) { console.error('React CDN failed to load'); return; }
  // Hooks
  window.useState             = R.useState;
  window.useEffect            = R.useEffect;
  window.useCallback          = R.useCallback;
  window.useMemo              = R.useMemo;
  window.useRef               = R.useRef;
  window.useContext           = R.useContext;
  window.useReducer           = R.useReducer;
  window.useLayoutEffect      = R.useLayoutEffect;
  window.useImperativeHandle  = R.useImperativeHandle;
  window.useId                = R.useId;
  window.useTransition        = R.useTransition;
  window.useDeferredValue     = R.useDeferredValue;
  window.startTransition      = R.startTransition;
  // APIs
  window.createContext        = R.createContext;
  window.forwardRef           = R.forwardRef;
  window.memo                 = R.memo;
  window.lazy                 = R.lazy;
  window.Fragment             = R.Fragment;
  window.StrictMode           = R.StrictMode;
  window.Suspense             = R.Suspense;
  window.Component            = R.Component;
  window.PureComponent        = R.PureComponent;
  // ReactDOM — expose createRoot/hydrateRoot as globals so named imports work
  if (RD) {
    window.createRoot  = function(el, opts) { return RD.createRoot(el, opts); };
    window.hydrateRoot = function(el, ui, opts) { return RD.hydrateRoot(el, ui, opts); };
  }
})();
`;

// ─── CDN tags ─────────────────────────────────────────────────────────────────
// FIX: Removed `crossorigin` attribute. In sandboxed iframes (null origin),
// crossorigin triggers a CORS preflight that silently blocks CDN script loading.
const REACT_CDN_TAGS = `
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2/dist/tailwind.min.css" rel="stylesheet"/>`;

// ─── Static asset inliner ─────────────────────────────────────────────────────
function inlineExternalAssets(
  html: string,
  files: Array<{ filename: string; language: string; code: string }>
): string {
  const byName = new Map<string, string>();
  for (const f of files) {
    const base = (f.filename.split("/").pop() ?? f.filename).toLowerCase();
    byName.set(base, f.code);
    byName.set(f.filename.toLowerCase(), f.code);
  }

  const resolve = (ref: string): string | undefined => {
    const base = (ref.split("/").pop() ?? ref).toLowerCase();
    return byName.get(base) ?? byName.get(ref.toLowerCase());
  };

  html = html.replace(
    /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi,
    (_, href) => { const c = resolve(href); return c != null ? `<style>\n${c}\n</style>` : ""; }
  );
  html = html.replace(
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*\/?>/gi,
    (_, href) => { const c = resolve(href); return c != null ? `<style>\n${c}\n</style>` : ""; }
  );
  html = html.replace(
    /<script[^>]+src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (_, src) => { const c = resolve(src); return c != null ? `<script>\n${c}\n\x3c/script>` : ""; }
  );

  return html;
}

export function sanitizeHtml(
  html: string,
  files: Array<{ filename: string; language: string; code: string }> = []
): string {
  if (files.length > 0) html = inlineExternalAssets(html, files);

  return html
    .replace(/<script[^>]+src=["'](?!https?:\/\/)([^"']+)["'][^>]*>\s*<\/script>/gi, "")
    .replace(/<link[^>]+href=["'](?!https?:\/\/)([^"']+)["'][^>]*\/?>/gi, "")
    .replace(/<script[^>]+type=["']module["'][^>]+src=["'][^"']*["'][^>]*>\s*<\/script>/gi, "")
    .replace(/^\s*import\s+.*?from\s+["'][./][^"']*["'];?\s*$/gm, "");
}

// ─── React code cleaner ───────────────────────────────────────────────────────
// FIX: Broader regex that catches ALL import patterns LLMs produce, including
// multi-line-style imports, `import type`, and bare side-effect imports.
function cleanReactCode(code: string): string {
  return (
    code
      // ── Strip ALL import statements ──────────────────────────────────────
      // Handles: default, named, namespace, type-only, and mixed imports
      .replace(
        /^\s*import\s+(?:type\s+)?(?:[\w$]+\s*,\s*)?(?:\*\s+as\s+[\w$]+|\{[^}]*\}|[\w$]+)?\s*from\s+['"][^'"]+['"]\s*;?\s*$/gm,
        ""
      )
      // Side-effect imports: import './foo.css'
      .replace(/^\s*import\s+['"][^'"]+['"]\s*;?\s*$/gm, "")
      // Dynamic imports referencing local files
      .replace(/\bimport\s*\(\s*['"](?:\.\/|\.\.\/)[^'"]*['"]\s*\)/g, "Promise.resolve({})")

      // ── Strip export keywords but preserve the declarations ───────────────
      .replace(/^\s*export\s+default\s+function\s+/gm, "function ")
      .replace(/^\s*export\s+default\s+class\s+/gm, "class ")
      // export default SomeName; — keep as comment so findRootComponent still finds it
      .replace(/^\s*export\s+default\s+([A-Z]\w*)\s*;?\s*$/gm, "/* __root__: $1 */")
      .replace(/^\s*export\s+(?:async\s+)?function\s+/gm, "function ")
      .replace(/^\s*export\s+const\s+/gm, "const ")
      .replace(/^\s*export\s+let\s+/gm, "let ")
      .replace(/^\s*export\s+var\s+/gm, "var ")
      .replace(/^\s*export\s+class\s+/gm, "class ")
      .replace(/^\s*export\s+\{[^}]*\}\s*(?:from\s+['"][^'"]*['"])?\s*;?\s*$/gm, "")
      .replace(/^\s*export\s+type\s+.*?(?:;|$)/gm, "")
  );
}

// ─── Root component detection ─────────────────────────────────────────────────
function findRootComponent(rawCode: string): string | null {
  // P1 — Existing ReactDOM.createRoot call → code self-mounts, don't add another
  if (/ReactDOM\s*\.\s*createRoot\s*\(/.test(rawCode)) return null;

  // P2 — Standalone createRoot (from our shim, e.g. const root = createRoot(...))
  if (/\bcreateRoot\s*\(/.test(rawCode)) return null;

  // P3 — Legacy ReactDOM.render
  if (/ReactDOM\s*\.\s*render\s*\(/.test(rawCode)) return null;

  // P4 — export default SomeName (bare re-export, captured as comment by cleanReactCode)
  const m4 = rawCode.match(/\/\*\s*__root__:\s*([A-Z][A-Za-z0-9]*)\s*\*\//);
  if (m4) return m4[1];

  // P5 — export default function Name  /  export default class Name
  const m5 = rawCode.match(/export\s+default\s+(?:function|class)\s+([A-Z][A-Za-z0-9]*)/);
  if (m5) return m5[1];

  // P6 — Well-known root names present in code
  for (const name of ["App", "Application", "Root", "Main", "Page", "Index", "Home"]) {
    if (new RegExp(`(?:function|class|const|let|var)\\s+${name}\\b`).test(rawCode)) return name;
  }

  // P7 — Any capitalised component; pick the last one (statistically the outermost)
  const excluded = new Set([
    "Fragment", "StrictMode", "Suspense", "Component", "PureComponent",
    "React", "ReactDOM", "Error", "Promise", "Object", "Array", "Map", "Set",
  ]);
  const candidates: string[] = [];
  const re1 = /(?:function|class)\s+([A-Z][A-Za-z0-9]*)\s*[({]/g;
  const re2 = /(?:const|let|var)\s+([A-Z][A-Za-z0-9]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][A-Za-z0-9_$]*)\s*=>/g;
  let m: RegExpExecArray | null;
  while ((m = re1.exec(rawCode)) !== null) if (!excluded.has(m[1])) candidates.push(m[1]);
  while ((m = re2.exec(rawCode)) !== null) if (!excluded.has(m[1])) candidates.push(m[1]);
  return candidates.length > 0 ? candidates[candidates.length - 1] : null;
}

// ─── React mount script ───────────────────────────────────────────────────────
// FIX: findRootComponent now returns null when code already has a mount call,
// so this function never double-mounts.
function buildMountScript(rawCode: string): string {
  const root = findRootComponent(rawCode);

  // Code self-mounts (findRootComponent returned null)
  if (root === null) {
    return `setTimeout(function(){window.parent.postMessage({type:'done'},'*');},800);`;
  }

  // We need to mount the detected root component
  return `
try {
  var _rootEl = document.getElementById('root');
  if (!_rootEl) throw new Error('No #root element found in DOM');
  ReactDOM.createRoot(_rootEl).render(
    React.createElement(React.StrictMode, null, React.createElement(${root}))
  );
} catch (_e) {
  document.getElementById('root').innerHTML =
    '<div id="preview-error">Mount error: ' + _e.message + '</div>';
  window.parent.postMessage({type:'error', data:'Mount error: ' + _e.message},'*');
}
setTimeout(function(){window.parent.postMessage({type:'done'},'*');},800);`;
}

// ─── No-component fallback ────────────────────────────────────────────────────
function buildNoComponentHtml(): string {
  return `<div id="preview-error" style="padding:24px;font-family:monospace;font-size:13px;
color:#f87171;background:#1a0a0a;border:1px solid #7f1d1d;border-radius:8px;margin:16px">
<strong>No React component found to render.</strong><br/><br/>
Make sure your code defines a capitalised component, e.g.<br/>
<code>export default function App() { return &lt;div&gt;Hello&lt;/div&gt;; }</code>
</div>`;
}

// ─── React HTML builders ──────────────────────────────────────────────────────
function buildReactHtml(rawCode: string, inlineCss = ""): string {
  const cleaned = cleanReactCode(rawCode);
  const mountScript = buildMountScript(rawCode);
  const root = findRootComponent(rawCode);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  ${REACT_CDN_TAGS}
  <style>
    *,*::before,*::after{box-sizing:border-box}
    body{margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif}
    #root{min-height:100vh}
    #preview-error{color:#f87171;background:#1a0a0a;border:1px solid #7f1d1d;border-radius:6px;padding:12px 16px;margin:16px;font-family:monospace;font-size:13px;white-space:pre-wrap}
    ${inlineCss}
  </style>
</head>
<body>
  <div id="root">${root === null ? "" : ""}</div>
  <script>${BRIDGE_SCRIPT}</script>
  <!-- FIX: REACT_SHIM exposes all React hooks + createRoot as window globals
       so stripped imports don't cause "useState is not defined" errors -->
  <script>${REACT_SHIM}</script>
  <script type="text/babel" data-presets="react,typescript">
${cleaned}
${mountScript}
  </script>
</body>
</html>`;
}

function buildReactBundle(cleanedCode: string, rawCode: string, inlineCss: string): string {
  const mountScript = buildMountScript(rawCode);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  ${REACT_CDN_TAGS}
  <style>
    *,*::before,*::after{box-sizing:border-box}
    body{margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif}
    #root{min-height:100vh}
    #preview-error{color:#f87171;background:#1a0a0a;border:1px solid #7f1d1d;border-radius:6px;padding:12px 16px;margin:16px;font-family:monospace;font-size:13px;white-space:pre-wrap}
    ${inlineCss}
  </style>
</head>
<body>
  <div id="root"></div>
  <script>${BRIDGE_SCRIPT}</script>
  <script>${REACT_SHIM}</script>
  <script type="text/babel" data-presets="react,typescript">
${cleanedCode}
${mountScript}
  </script>
</body>
</html>`;
}

// ─── Other language builders ──────────────────────────────────────────────────
function buildTsHtml(code: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>body{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;margin:0;padding:16px}#console-output{background:#1a1e2e;border:1px solid #2d3348;border-radius:8px;padding:12px;font-family:monospace;font-size:13px;white-space:pre-wrap;min-height:40px}.console-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#4a5568;margin-bottom:4px}</style>
</head><body>
<div id="app"></div><div class="console-label">Console</div><pre id="console-output"></pre>
<script>${BRIDGE_SCRIPT}</script>
<script>
  var _out=document.getElementById('console-output');
  var _ol=console.log,_oe=console.error;
  console.log=function(){var s=Array.from(arguments).map(function(a){return typeof a==='object'?JSON.stringify(a,null,2):String(a);}).join(' ');var sp=document.createElement('span');sp.style.color='#a0aec0';sp.textContent=s+'\\n';_out.appendChild(sp);_ol.apply(console,arguments);};
  console.error=function(){var s=Array.from(arguments).join(' ');var sp=document.createElement('span');sp.style.color='#fc8181';sp.textContent=s+'\\n';_out.appendChild(sp);_oe.apply(console,arguments);};
</script>
<script type="text/babel" data-presets="typescript">
try{${code}}catch(e){console.error(e.message);}finally{setTimeout(function(){window.parent.postMessage({type:'done'},'*');},500);}
</script>
</body></html>`;
}

function buildJsHtml(code: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>body{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;margin:0;padding:16px}#console-output{background:#1a1e2e;border:1px solid #2d3348;border-radius:8px;padding:12px;font-family:monospace;font-size:13px;white-space:pre-wrap;min-height:40px}.console-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#4a5568;margin-bottom:4px}</style>
</head><body>
<div id="app"></div><div class="console-label">Console</div><pre id="console-output"></pre>
<script>${BRIDGE_SCRIPT}</script>
<script>
  var _out=document.getElementById('console-output');
  var _ol=console.log,_oe=console.error;
  console.log=function(){var s=Array.from(arguments).map(function(a){return typeof a==='object'?JSON.stringify(a,null,2):String(a);}).join(' ');var sp=document.createElement('span');sp.style.color='#a0aec0';sp.textContent=s+'\\n';_out.appendChild(sp);_ol.apply(console,arguments);};
  console.error=function(){var s=Array.from(arguments).join(' ');var sp=document.createElement('span');sp.style.color='#fc8181';sp.textContent=s+'\\n';_out.appendChild(sp);_oe.apply(console,arguments);};
  try{${code}}catch(e){console.error(e.name+': '+e.message);}finally{window.parent.postMessage({type:'done'},'*');}
</script>
</body></html>`;
}

function buildCssHtml(css: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>${css}</style>
<script>${BRIDGE_SCRIPT}setTimeout(function(){window.parent.postMessage({type:'done'},'*');},600);\x3c/script>
</head><body>
  <div class="container"><h1>CSS Preview</h1><p>Your styles have been applied.</p>
  <button class="btn">Sample Button</button><div class="card"><span>Sample Card</span></div></div>
</body></html>`;
}

function buildFullHtml(
  rawHtml: string,
  files: Array<{ filename: string; language: string; code: string }> = []
): string {
  let html = sanitizeHtml(rawHtml, files);
  const bridge = `<script>${BRIDGE_SCRIPT}setTimeout(function(){window.parent.postMessage({type:'done'},'*');},800);\x3c/script>`;
  if (html.includes("</body>"))      html = html.replace(/<\/body>/i,  bridge + "</body>");
  else if (html.includes("</html>")) html = html.replace(/<\/html>/i, bridge + "</html>");
  else html += bridge;
  return html;
}

// ─── Main executor ────────────────────────────────────────────────────────────
// Signature: executeInBrowser(language, code, timeout?)
export function executeInBrowser(
  language: string,
  code: string,
  timeout = 12000
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const start  = performance.now();
    const logs:   string[] = [];
    const errors: string[] = [];
    const lang   = language.toLowerCase();
    const isVisual = ["html", "react", "jsx", "tsx", "css"].includes(lang);

    const iframe = document.createElement("iframe");
    iframe.sandbox.add("allow-scripts");
    iframe.style.cssText = "display:none;position:fixed;top:-9999px;left:-9999px;";
    document.body.appendChild(iframe);

    const cleanup = () => { try { document.body.removeChild(iframe); } catch { /**/ } };

    let done = false;
    const finish = (timedOut = false) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      window.removeEventListener("message", handler);
      const elapsed = `${((performance.now() - start) / 1000).toFixed(2)}s`;

      if (timedOut && isVisual && errors.length === 0) {
        cleanup();
        resolve({ stdout: logs.join("\n") || "Page rendered successfully", stderr: "", exitCode: 0, executionTime: elapsed, isReal: true, language: lang });
        return;
      }
      cleanup();
      resolve({ stdout: logs.join("\n") || (errors.length === 0 ? "Executed (no output)" : ""), stderr: errors.join("\n"), exitCode: errors.length > 0 ? 1 : 0, executionTime: elapsed, isReal: true, language: lang });
    };

    const timer = setTimeout(() => finish(true), timeout);
    const handler = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return;
      const { type, data } = e.data ?? {};
      if      (type === "log")   logs.push(data);
      else if (type === "error") errors.push(data);
      else if (type === "done")  finish(false);
    };
    window.addEventListener("message", handler);

    let html: string;
    switch (lang) {
      case "react":
      case "jsx":
      case "tsx":
        html = buildReactHtml(code);
        break;
      case "typescript":
        html = buildTsHtml(code);
        break;
      case "css":
        html = buildCssHtml(code);
        break;
      case "javascript":
        // FIX: Auto-detect React in plain JS files. LLMs often output React
        // components with language="javascript", which previously used buildJsHtml
        // (no Babel, no React) → blank screen / JSX as text.
        if (isReactFile({ filename: "_.js", language: "javascript", code })) {
          html = buildReactHtml(code);
        } else {
          html = buildJsHtml(code);
        }
        break;
      case "html":
      default:
        html = buildFullHtml(code);
        break;
    }

    try {
      const doc = iframe.contentDocument;
      if (doc) { doc.open(); doc.write(html); doc.close(); }
      else finish(false);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Iframe write failed");
      finish(false);
    }
  });
}

// ─── Multi-file bundler ───────────────────────────────────────────────────────
export function bundleWebFiles(
  files: Array<{ filename: string; language: string; code: string }>
): string {
  const browserFiles = files.filter((f) => !isServerSideFile(f));
  const serverFiles  = files.filter((f) =>  isServerSideFile(f));

  if (browserFiles.length === 0) {
    const list = serverFiles.map((f) => `• ${f.filename}`).join("\n");
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>body{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}.card{background:#1a1e2e;border:1px solid #2d3348;border-radius:12px;padding:32px 40px;text-align:center;max-width:420px}h2{margin:0 0 8px;color:#a78bfa}p{margin:0 0 16px;color:#94a3b8;font-size:14px}pre{background:#0f1117;border:1px solid #2d3348;border-radius:8px;padding:12px;font-size:12px;text-align:left;color:#64748b;white-space:pre-wrap}</style>
</head><body><div class="card"><h2>⚙️ Backend Project</h2><p>Runs server-side — see Console for output.</p><pre>${list}</pre></div></body></html>`;
  }

  const htmlFiles = browserFiles.filter((f) => f.language === "html" || f.filename.endsWith(".html") || f.filename.endsWith(".htm"));
  const cssFiles  = browserFiles.filter((f) => f.language === "css"  || f.filename.endsWith(".css"));

  // FIX: Use isReactFile() instead of a narrow extension/language check.
  // This catches React code in .js and .ts files that the LLM outputs.
  const reactFiles = browserFiles.filter(isReactFile);
  const tsFiles    = browserFiles.filter((f) => !isReactFile(f) && (f.language === "typescript" || (f.filename.endsWith(".ts") && !f.filename.endsWith(".d.ts"))));
  const jsFiles    = browserFiles.filter((f) => !isReactFile(f) && (f.language === "javascript" || f.filename.endsWith(".js")) && !f.filename.endsWith(".test.js") && !f.filename.endsWith(".spec.js"));

  // ── React ─────────────────────────────────────────────────────────────────
  if (reactFiles.length > 0) {
    const inlineCss = cssFiles.map((f) => f.code).join("\n");

    // Order: child components first, then entry points (App/index)
    const rootPat  = /^(?:App|index|main)\.(jsx|tsx|js|ts)$/i;
    const children = reactFiles.filter((f) => !rootPat.test(f.filename.split("/").pop() ?? ""));
    const roots    = reactFiles.filter((f) =>  rootPat.test(f.filename.split("/").pop() ?? ""));
    const ordered  = [...children, ...roots];

    const cleanedCode = ordered
      .map((f) => `// ═══ ${f.filename} ═══\n${cleanReactCode(f.code)}`)
      .join("\n\n");
    const rawCode = ordered.map((f) => f.code).join("\n\n");

    return buildReactBundle(cleanedCode, rawCode, inlineCss);
  }

  // ── TypeScript (non-React) ────────────────────────────────────────────────
  if (tsFiles.length > 0) {
    const code     = tsFiles.map((f) => `// ═══ ${f.filename} ═══\n${f.code}`).join("\n\n");
    const styleTag = cssFiles.length > 0 ? `<style>\n${cssFiles.map((f) => f.code).join("\n")}\n</style>` : "";
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
${styleTag}
<style>body{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;margin:0;padding:16px}#console-output{background:#1a1e2e;border:1px solid #2d3348;border-radius:8px;padding:12px;font-family:monospace;font-size:13px;white-space:pre-wrap;min-height:40px}.console-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#4a5568;margin-bottom:4px}</style>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head><body><div id="app"></div><div class="console-label">Console</div><pre id="console-output"></pre>
<script>${BRIDGE_SCRIPT}</script>
<script type="text/babel" data-presets="typescript">${code}</script>
</body></html>`;
  }

  // ── Plain JavaScript ──────────────────────────────────────────────────────
  if (jsFiles.length > 0) {
    const jsCode = jsFiles.map((f) => `// ═══ ${f.filename} ═══\n${f.code}`).join("\n\n");
    if (htmlFiles.length > 0) {
      return sanitizeHtml(htmlFiles[0].code, [...cssFiles, ...jsFiles]);
    }
    const styleBlock  = cssFiles.length > 0 ? `<style>\n${cssFiles.map((f) => f.code).join("\n")}\n</style>` : "";
    const scriptBlock = `<script>${BRIDGE_SCRIPT}\n${jsCode}\nwindow.parent.postMessage({type:'done'},'*');\x3c/script>`;
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>${styleBlock}</head><body><div id="app"></div>${scriptBlock}</body></html>`;
  }

  // ── HTML + CSS ────────────────────────────────────────────────────────────
  if (htmlFiles.length > 0) {
    return sanitizeHtml(htmlFiles[0].code, cssFiles);
  }

  // ── CSS only ──────────────────────────────────────────────────────────────
  if (cssFiles.length > 0) {
    return buildCssHtml(cssFiles.map((f) => f.code).join("\n"));
  }

  return `<!DOCTYPE html><html><body><p style="font-family:sans-serif;padding:16px;color:#666">No renderable files found.</p></body></html>`;
}