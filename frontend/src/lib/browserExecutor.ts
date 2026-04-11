// src/lib/browserExecutor.ts
// Hybrid execution: real browser execution for JS/HTML/CSS/React/TS, remote for backend

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
  "javascript",
  "html",
  "css",
  "typescript",
  "react",
  "jsx",
  "tsx",
];

export const BACKEND_LANGUAGES = [
  "python",
  "java",
  "node",
  "nodejs",
  "ruby",
  "go",
  "rust",
  "cpp",
  "c",
  "bash",
  "shell",
  "kotlin",
  "swift",
  "scala",
  "php",
  "r",
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
  /\bapp\.use\s*\(/,
  /mongoose\.connect\s*\(/,
  /new\s+Schema\s*\(\s*\{/,
  /Router\s*\(\s*\)/,
  /\.findOne\s*\(|\.findById\s*\(|\.save\s*\(\s*\)/,
  /stripe\s*\(\s*process/i,
  /paymentIntents\.create/,
  /bcrypt\.hash|bcrypt\.compare/,
  /jwt\.sign|jwt\.verify/,
  /cors\s*\(\s*\)/,
  /bodyParser\.|express\.json\(\)/,
];

const SERVER_FILENAMES = new Set([
  "server.js",
  "server.ts",
  "app.js",
  "app.ts",
  "database.js",
  "database.ts",
  "db.js",
  "db.ts",
  "payment.js",
  "payment.ts",
  "auth.js",
  "auth.ts",
  "routes.js",
  "routes.ts",
  "middleware.js",
  "middleware.ts",
  "models.js",
  "models.ts",
  "config.js",
  "config.ts",
]);

export function isServerSideFile(file: {
  filename: string;
  code: string;
}): boolean {
  const base = file.filename.split("/").pop()?.toLowerCase() ?? "";
  if (SERVER_FILENAMES.has(base)) {
    if (base === "index.js" || base === "index.ts") {
      return SERVER_PATTERNS.some((p) => p.test(file.code));
    }
    return true;
  }
  return SERVER_PATTERNS.some((p) => p.test(file.code));
}

// ─── HTML sanitiser ───────────────────────────────────────────────────────────
export function sanitizeHtml(html: string): string {
  return html
    .replace(
      /<script[^>]+src=["'][^"']*\/src\/[^"']*["'][^>]*>\s*<\/script>/gi,
      "",
    )
    .replace(/<link[^>]+href=["'][^"']*\/src\/[^"']*["'][^>]*\/?>/gi, "")
    .replace(/<link[^>]+href=["']\.\/[^"']*["'][^>]*\/?>/gi, "")
    .replace(
      /<script[^>]+type=["']module["'][^>]+src=["'][^"']*["'][^>]*>\s*<\/script>/gi,
      "",
    )
    .replace(
      /^\s*import\s+.*?from\s+["'][./]+(?:src|components|pages|lib|hooks)[^"']*["'];?\s*$/gm,
      "",
    );
}

// ─── Shared postMessage bridge ────────────────────────────────────────────────
const BRIDGE_SCRIPT = `
(function(){
  var _p = window.parent;
  var _fmt = function(a){return Array.prototype.slice.call(a).map(function(x){return typeof x==='object'?JSON.stringify(x,null,2):String(x);}).join(' ');};
  var _ol = console.log, _ow = console.warn, _oi = console.info, _oe = console.error;
  console.log   = function(){ var s=_fmt(arguments); _p.postMessage({type:'log',   data:s},'*'); _ol.apply(console,arguments); };
  console.warn  = function(){ var s=_fmt(arguments); _p.postMessage({type:'log',   data:'⚠ '+s},'*'); _ow.apply(console,arguments); };
  console.info  = function(){ var s=_fmt(arguments); _p.postMessage({type:'log',   data:s},'*'); _oi.apply(console,arguments); };
  console.error = function(){ var s=_fmt(arguments); _p.postMessage({type:'error', data:s},'*'); _oe.apply(console,arguments); };
  window.onerror = function(_m,_s,_l,_c,e){ _p.postMessage({type:'error',data:e?e.message:_m},'*'); return true; };
})();`;

// ─── HTML page builders ───────────────────────────────────────────────────────
function buildReactHtml(code: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2/dist/tailwind.min.css" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box}
    body{margin:0;padding:0;font-family:system-ui,sans-serif}
    #preview-error{color:#f87171;background:#1a0a0a;border:1px solid #7f1d1d;border-radius:6px;padding:12px 16px;margin:16px;font-family:monospace;font-size:13px;white-space:pre-wrap}
  </style>
</head>
<body>
  <div id="root"></div>
  <script>${BRIDGE_SCRIPT}</script>
  <script type="text/babel" data-presets="react,typescript">
    try {
      ${code}
      var _root = document.getElementById('root');
      if (typeof App !== 'undefined') {
        ReactDOM.createRoot(_root).render(React.createElement(App));
      } else if (typeof default_1 !== 'undefined') {
        ReactDOM.createRoot(_root).render(React.createElement(default_1));
      }
    } catch(e) {
      window.parent.postMessage({type:'error', data:e.name+': '+e.message},'*');
      document.getElementById('root').innerHTML='<div id="preview-error">'+e.name+': '+e.message+'</div>';
    } finally {
      setTimeout(function(){ window.parent.postMessage({type:'done'},'*'); }, 600);
    }
  </script>
</body>
</html>`;
}

function buildTsHtml(code: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;margin:0;padding:16px}
    #app{margin-bottom:16px}
    #console-output{background:#1a1e2e;border:1px solid #2d3348;border-radius:8px;padding:12px;font-family:monospace;font-size:13px;white-space:pre-wrap;min-height:40px}
    .console-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#4a5568;margin-bottom:4px}
  </style>
</head>
<body>
  <div id="app"></div>
  <div class="console-label">Console</div>
  <pre id="console-output"></pre>
  <script>${BRIDGE_SCRIPT}</script>
  <script>
    var _out=document.getElementById('console-output');
    var _origLog=console.log,_origErr=console.error;
    var _write=function(color,args){var line=document.createElement('span');line.style.color=color;line.textContent=args+'\\n';_out.appendChild(line);};
    console.log=function(){var s=Array.from(arguments).map(function(a){return typeof a==='object'?JSON.stringify(a,null,2):String(a);}).join(' ');_write('#a0aec0',s);_origLog.apply(console,arguments);};
    console.error=function(){var s=Array.from(arguments).join(' ');_write('#fc8181',s);_origErr.apply(console,arguments);};
  </script>
  <script type="text/babel" data-presets="typescript">
    try {
      ${code}
    } catch(e) {
      console.error(e.message);
    } finally {
      setTimeout(function(){ window.parent.postMessage({type:'done'},'*'); }, 500);
    }
  </script>
</body>
</html>`;
}

function buildJsHtml(code: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;margin:0;padding:16px}
    #app{margin-bottom:16px}
    #console-output{background:#1a1e2e;border:1px solid #2d3348;border-radius:8px;padding:12px;font-family:monospace;font-size:13px;white-space:pre-wrap;min-height:40px}
    .console-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#4a5568;margin-bottom:4px}
  </style>
</head>
<body>
  <div id="app"></div>
  <div class="console-label">Console</div>
  <pre id="console-output"></pre>
  <script>${BRIDGE_SCRIPT}</script>
  <script>
    var _out=document.getElementById('console-output');
    var _origLog=console.log,_origErr=console.error;
    var _write=function(color,args){var line=document.createElement('span');line.style.color=color;line.textContent=args+'\\n';_out.appendChild(line);};
    var __prevLog=console.log,__prevErr=console.error;
    console.log=function(){var s=Array.from(arguments).map(function(a){return typeof a==='object'?JSON.stringify(a,null,2):String(a);}).join(' ');_write('#a0aec0',s);__prevLog.apply(console,arguments);};
    console.error=function(){var s=Array.from(arguments).join(' ');_write('#fc8181',s);__prevErr.apply(console,arguments);};
    try {
      ${code}
    } catch(e) { console.error(e.name+': '+e.message); }
    finally { window.parent.postMessage({type:'done'},'*'); }
  </script>
</body>
</html>`;
}

function buildFullHtml(rawHtml: string): string {
  let html = sanitizeHtml(rawHtml);
  const bridge = `<script>${BRIDGE_SCRIPT}setTimeout(function(){window.parent.postMessage({type:'done'},'*');},800);</script>`;
  if (html.includes("</body>")) {
    html = html.replace(/<\/body>/i, bridge + "</body>");
  } else if (html.includes("</html>")) {
    html = html.replace(/<\/html>/i, bridge + "</html>");
  } else {
    html += bridge;
  }
  return html;
}

function buildCssHtml(css: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>${css}</style>
  <script>${BRIDGE_SCRIPT}setTimeout(function(){window.parent.postMessage({type:'done'},'*');},600);</script>
</head>
<body>
  <div class="container">
    <h1>CSS Preview</h1>
    <p>Your styles have been applied.</p>
    <button class="btn">Sample Button</button>
    <div class="card"><span>Sample Card</span></div>
  </div>
</body>
</html>`;
}

// ─── Main browser executor ────────────────────────────────────────────────────
export function executeInBrowser(
  code: string,
  language: string,
  timeout = 12000,
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const start = performance.now();
    const logs: string[] = [];
    const errors: string[] = [];
    const lang = language.toLowerCase();

    const isVisualLang =
      lang === "html" ||
      lang === "react" ||
      lang === "jsx" ||
      lang === "tsx" ||
      lang === "css";

    const iframe = document.createElement("iframe");
    iframe.sandbox.add("allow-scripts");
    iframe.style.cssText =
      "display:none;position:fixed;top:-9999px;left:-9999px;";
    document.body.appendChild(iframe);

    const cleanup = () => {
      try {
        document.body.removeChild(iframe);
      } catch {
        /* already removed */
      }
    };

    let finished = false;
    const finish = (timedOut = false) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      window.removeEventListener("message", handler);
      const elapsed = `${((performance.now() - start) / 1000).toFixed(2)}s`;

      if (timedOut && isVisualLang && errors.length === 0) {
        cleanup();
        resolve({
          stdout: logs.join("\n") || "Page rendered successfully",
          stderr: "",
          exitCode: 0,
          executionTime: elapsed,
          isReal: true,
          language: lang,
        });
        return;
      }

      cleanup();
      resolve({
        stdout:
          logs.join("\n") ||
          (errors.length === 0 ? "Code executed successfully (no output)" : ""),
        stderr: errors.join("\n"),
        exitCode: errors.length > 0 ? 1 : 0,
        executionTime: elapsed,
        isReal: true,
        language: lang,
      });
    };

    const timer = setTimeout(() => finish(true), timeout);

    const handler = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      const { type, data } = event.data ?? {};
      if (type === "log") logs.push(data);
      else if (type === "error") errors.push(data);
      else if (type === "done") finish(false);
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
        html = buildJsHtml(code);
        break;
      case "html":
      default:
        html = buildFullHtml(code);
        break;
    }

    try {
      const doc = iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      } else {
        finish(false);
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Iframe write failed");
      finish(false);
    }
  });
}

// ─── Multi-file bundler (FIXED for multi‑component React projects) ────────────
export function bundleWebFiles(
  files: Array<{ filename: string; language: string; code: string }>,
): string {
  const browserFiles = files.filter((f) => !isServerSideFile(f));
  const serverFiles = files.filter((f) => isServerSideFile(f));

  if (browserFiles.length === 0) {
    const fileList = serverFiles.map((f) => `• ${f.filename}`).join("\n");
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/>
<style>
  body{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
  .card{background:#1a1e2e;border:1px solid #2d3348;border-radius:12px;padding:32px 40px;text-align:center;max-width:420px}
  h2{margin:0 0 8px;color:#a78bfa}p{margin:0 0 16px;color:#94a3b8;font-size:14px}
  pre{background:#0f1117;border:1px solid #2d3348;border-radius:8px;padding:12px;font-size:12px;text-align:left;color:#64748b;white-space:pre-wrap}
</style></head>
<body>
  <div class="card">
    <h2>⚙️ Backend Project</h2>
    <p>This project runs server-side — check the Console panel for output.</p>
    <pre>${fileList}</pre>
  </div>
</body>
</html>`;
  }

  const htmlFile = browserFiles.find(
    (f) =>
      f.language === "html" ||
      f.filename.endsWith(".html") ||
      f.filename.endsWith(".htm"),
  );
  const cssFiles = browserFiles.filter(
    (f) => f.language === "css" || f.filename.endsWith(".css"),
  );
  const tsxFiles = browserFiles.filter(
    (f) =>
      f.language === "react" ||
      f.filename.endsWith(".tsx") ||
      f.filename.endsWith(".jsx"),
  );
  const tsFiles = browserFiles.filter(
    (f) => f.language === "typescript" || f.filename.endsWith(".ts"),
  );
  const jsFiles = browserFiles.filter(
    (f) =>
      (f.language === "javascript" || f.filename.endsWith(".js")) &&
      !f.filename.endsWith(".test.js") &&
      !f.filename.endsWith(".spec.js"),
  );

  // ─── React / JSX / TSX: bundle all components together ──────────────────────
  if (tsxFiles.length > 0) {
    const inlineCss = cssFiles.map((f) => f.code).join("\n");

    // Sort files: put App.jsx / index.jsx first, then others
    const mainPattern = /(App|index)\.(jsx|tsx)$/i;
    const mainFiles = tsxFiles.filter((f) => mainPattern.test(f.filename));
    const otherFiles = tsxFiles.filter((f) => !mainPattern.test(f.filename));
    const orderedFiles = [...mainFiles, ...otherFiles];

    // Concatenate code with file comments for debugging
    const combinedCode = orderedFiles
      .map((f) => `// === ${f.filename} ===\n${f.code}`)
      .join("\n\n");

    return buildReactBundle(combinedCode, inlineCss);
  }

  // ─── TypeScript (non‑React) ─────────────────────────────────────────────────
  if (tsFiles.length > 0) {
    const tsCode = tsFiles
      .map((f) => `// === ${f.filename} ===\n${f.code}`)
      .join("\n\n");
    const styleTag =
      cssFiles.length > 0
        ? `<style>\n${cssFiles.map((f) => f.code).join("\n\n")}\n</style>`
        : "";
    const babelTag = `<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script><script type="text/babel" data-presets="typescript">\n${tsCode}\n</script>`;
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  ${styleTag}
  <style>
    body{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;margin:0;padding:16px}
    #console-output{background:#1a1e2e;border:1px solid #2d3348;border-radius:8px;padding:12px;font-family:monospace;font-size:13px;white-space:pre-wrap;min-height:40px}
    .console-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#4a5568;margin-bottom:4px}
  </style>
</head>
<body>
  <div id="app"></div>
  <div class="console-label">Console</div>
  <pre id="console-output"></pre>
  <script>${BRIDGE_SCRIPT}</script>
  ${babelTag}
</body>
</html>`;
  }

  // ─── Plain JavaScript ───────────────────────────────────────────────────────
  if (jsFiles.length > 0) {
    const jsCode = jsFiles
      .map((f) => `// === ${f.filename} ===\n${f.code}`)
      .join("\n\n");
    const styleTag =
      cssFiles.length > 0
        ? `<style>\n${cssFiles.map((f) => f.code).join("\n\n")}\n</style>`
        : "";
    const scriptTag = `<script>\n${jsCode}\n</script>`;
    let baseHtml = htmlFile
      ? sanitizeHtml(htmlFile.code)
      : "<!DOCTYPE html><html><head></head><body></body></html>";

    if (styleTag) {
      baseHtml = baseHtml.includes("</head>")
        ? baseHtml.replace(/<\/head>/i, styleTag + "</head>")
        : styleTag + baseHtml;
    }
    baseHtml = baseHtml.includes("</body>")
      ? baseHtml.replace(/<\/body>/i, scriptTag + "</body>")
      : baseHtml + scriptTag;
    return baseHtml;
  }

  // ─── HTML only (with CSS) ───────────────────────────────────────────────────
  let baseHtml = htmlFile
    ? sanitizeHtml(htmlFile.code)
    : "<!DOCTYPE html><html><head></head><body></body></html>";

  if (cssFiles.length > 0) {
    const styleTag = `<style>\n${cssFiles.map((f) => f.code).join("\n\n")}\n</style>`;
    baseHtml = baseHtml.includes("</head>")
      ? baseHtml.replace(/<\/head>/i, styleTag + "</head>")
      : styleTag + baseHtml;
  }

  return baseHtml;
}

/** Babel-based bundle for multi‑file React projects */
function buildReactBundle(combinedCode: string, inlineCss: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2/dist/tailwind.min.css" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box}body{margin:0;padding:0;font-family:system-ui,sans-serif}
    #preview-error{color:#f87171;background:#1a0a0a;border:1px solid #7f1d1d;border-radius:6px;padding:12px 16px;margin:16px;font-family:monospace;font-size:13px;white-space:pre-wrap}
    ${inlineCss}
  </style>
</head>
<body>
  <div id="root"></div>
  <script>${BRIDGE_SCRIPT}</script>
  <script type="text/babel" data-presets="react,typescript">
    window.onerror=function(_m,_s,_l,_c,err){document.getElementById('root').innerHTML='<div id="preview-error">'+(err?err.message:_m)+'</div>';return true;};
    try{
      ${combinedCode}
      var _root=document.getElementById('root');
      if(typeof App!=='undefined'){ReactDOM.createRoot(_root).render(React.createElement(App));}
      else if(typeof default_1 !== 'undefined'){ReactDOM.createRoot(_root).render(React.createElement(default_1));}
    }catch(e){document.getElementById('root').innerHTML='<div id="preview-error">'+e.name+': '+e.message+'</div>';}
    setTimeout(function(){ window.parent.postMessage({type:'done'},'*'); }, 600);
  </script>
</body>
</html>`;
}