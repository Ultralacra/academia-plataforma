import fs from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';

const ROOT = process.cwd();
const TARGET_DIRS = ['app', 'components', 'lib', 'hooks'];
const EXT_OK = new Set(['.ts', '.tsx', '.js', '.jsx']);

function isConsoleLogCall(node) {
  if (!ts.isCallExpression(node)) return false;
  const expr = node.expression;
  if (ts.isPropertyAccessExpression(expr)) {
    return (
      ts.isIdentifier(expr.expression) &&
      expr.expression.text === 'console' &&
      expr.name.text === 'log'
    );
  }
  if (ts.isElementAccessExpression(expr)) {
    if (!ts.isIdentifier(expr.expression)) return false;
    if (expr.expression.text !== 'console') return false;
    const arg = expr.argumentExpression;
    return ts.isStringLiteral(arg) && arg.text === 'log';
  }
  return false;
}

function scriptKindForFile(filePath) {
  if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (filePath.endsWith('.ts')) return ts.ScriptKind.TS;
  if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function walkDir(dirAbs, out) {
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name === 'node_modules' || ent.name === '.next' || ent.name === 'out') continue;
    const abs = path.join(dirAbs, ent.name);
    if (ent.isDirectory()) {
      walkDir(abs, out);
    } else {
      const ext = path.extname(ent.name);
      if (EXT_OK.has(ext)) out.push(abs);
    }
  }
}

function applyEdits(text, edits) {
  // edits: [{start,end,replacement}] sorted descending by start
  let out = text;
  for (const e of edits) {
    out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  }
  return out;
}

function getText(text, node) {
  return text.slice(node.getStart(), node.getEnd());
}

function getIndentAt(text, pos) {
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
  const m = /^[\t ]*/.exec(text.slice(lineStart, pos));
  return m ? m[0] : '';
}

function transformFile(fileAbs) {
  const rel = path.relative(ROOT, fileAbs).replace(/\\/g, '/');
  const original = fs.readFileSync(fileAbs, 'utf8');
  const sf = ts.createSourceFile(
    fileAbs,
    original,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForFile(fileAbs),
  );

  const edits = [];
  let found = 0;

  function visit(node) {
    if (isConsoleLogCall(node)) {
      found++;

      // Case 1: ExpressionStatement => replace whole statement with comment
      if (ts.isExpressionStatement(node.parent)) {
        const stmt = node.parent;
        const stmtText = original.slice(stmt.getStart(sf), stmt.getEnd());
        const indent = getIndentAt(original, stmt.getStart(sf));
        const replacement = `${indent}/* ${stmtText.trim()} */`;
        edits.push({ start: stmt.getStart(sf), end: stmt.getEnd(), replacement });
        return;
      }

      // Case 2: JSX expression like {console.log(...)}
      if (ts.isJsxExpression(node.parent) && node.parent.expression === node) {
        const jsx = node.parent;
        const callText = getText(original, node).trim();
        const replacement = `{/* ${callText} */}`;
        edits.push({ start: jsx.getStart(sf), end: jsx.getEnd(), replacement });
        return;
      }

      // Fallback: replace call expression with (/* console.log(...) */ void 0)
      const callText = getText(original, node).trim();
      const replacement = `(/* ${callText} */ void 0)`;
      edits.push({ start: node.getStart(sf), end: node.getEnd(), replacement });
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);

  if (edits.length === 0) return { rel, changed: false, found: 0 };

  edits.sort((a, b) => b.start - a.start);
  const next = applyEdits(original, edits);

  // Verify: reparse and ensure there are no remaining console.log calls
  const sf2 = ts.createSourceFile(
    fileAbs,
    next,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForFile(fileAbs),
  );
  let remaining = 0;
  (function verify(n) {
    if (isConsoleLogCall(n)) remaining++;
    ts.forEachChild(n, verify);
  })(sf2);

  if (remaining > 0) {
    throw new Error(`Quedaron ${remaining} console.log sin comentar en ${rel}`);
  }

  fs.writeFileSync(fileAbs, next, 'utf8');
  return { rel, changed: true, found };
}

function main() {
  const files = [];
  for (const d of TARGET_DIRS) {
    const abs = path.join(ROOT, d);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
      walkDir(abs, files);
    }
  }

  let changedCount = 0;
  let foundCount = 0;
  const changedFiles = [];

  for (const f of files) {
    const r = transformFile(f);
    if (r.changed) {
      changedCount++;
      foundCount += r.found;
      changedFiles.push(`${r.rel} (${r.found})`);
    }
  }

  console.log(`[comment-console-log] archivos modificados: ${changedCount}`);
  console.log(`[comment-console-log] console.log comentados: ${foundCount}`);
  if (changedFiles.length) {
    console.log('[comment-console-log] lista:');
    for (const line of changedFiles) console.log(' -', line);
  }
}

main();
