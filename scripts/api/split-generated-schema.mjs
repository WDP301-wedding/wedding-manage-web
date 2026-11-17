import ts from 'typescript';
import { format } from 'prettier';

const memberBudget = 270;
const inlineBudget = 200;
const lineCount = (text) => text.split(/\r?\n/u).length;

/** Split generated declarations without changing the public OpenAPI type exports. */
export async function splitGeneratedSchema(source, header, prettierConfig) {
  const ast = ts.createSourceFile('schema.d.ts', source, ts.ScriptTarget.Latest, true);
  const roots = ast.statements.filter((node) => node.name).map((node) => node.name.text);
  const bodies = new Map();
  const rewritten = new Map();
  let sequence = 0;

  function partition(name, members) {
    const chunks = [];
    let current = [];
    let size = 0;
    for (const member of members) {
      const lines = lineCount(member);
      if (current.length && size + lines > memberBudget) {
        chunks.push(current);
        current = [];
        size = 0;
      }
      current.push(member);
      size += lines;
    }
    if (current.length) chunks.push(current);
    if (chunks.length === 1) {
      bodies.set(name, `export type ${name} = {\n${chunks[0].join('\n')}\n};`);
    } else {
      const parts = chunks.map((chunk, index) => {
        const part = `${name}Part${String(index + 1).padStart(3, '0')}`;
        bodies.set(part, `export type ${part} = {\n${chunk.join('\n')}\n};`);
        return part;
      });
      bodies.set(name, `export type ${name} = ${parts.join(' & ')};`);
    }
    return name;
  }

  function rewrite(node) {
    if (rewritten.has(node)) return rewritten.get(node);
    const start = node.getStart(ast);
    let text = node.getText(ast);
    const changes = [];
    ts.forEachChild(node, (child) => {
      const value = rewrite(child);
      if (value !== child.getText(ast)) {
        changes.push({ start: child.getStart(ast) - start, end: child.end - start, value });
      }
    });
    for (const change of changes.sort((a, b) => b.start - a.start)) {
      text = text.slice(0, change.start) + change.value + text.slice(change.end);
    }
    if (ts.isTypeLiteralNode(node) && lineCount(text) > inlineBudget) {
      const name = `SchemaShape${String(++sequence).padStart(4, '0')}`;
      const members = node.members.map(
        (member) => source.slice(member.getFullStart(), member.getStart(ast)) + rewrite(member),
      );
      const reference = partition(name, members);
      rewritten.set(node, reference);
      return reference;
    }
    rewritten.set(node, text);
    return text;
  }

  const facade = [];
  for (const node of ast.statements) {
    if (ts.isInterfaceDeclaration(node)) {
      const members = node.members.map(
        (member) => source.slice(member.getFullStart(), member.getStart(ast)) + rewrite(member),
      );
      const name = node.name.text;
      if (lineCount(members.join('\n')) > memberBudget) {
        const base = partition(`${name}Members`, members);
        facade.push(`export interface ${name} extends ${base} {}`);
      } else {
        facade.push(`export interface ${name} {\n${members.join('\n')}\n}`);
      }
    } else {
      facade.push(node.getText(ast));
    }
  }

  function identifiers(text) {
    const names = new Set();
    const file = ts.createSourceFile('part.d.ts', text, ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isIdentifier(node)) names.add(node.text);
      ts.forEachChild(node, visit);
    }
    visit(file);
    return names;
  }

  const result = new Map();
  const names = [...bodies.keys()];
  async function render(filename, body, ownName) {
    const used = identifiers(body);
    const imports = [];
    if (filename !== 'schema.d.ts') {
      const rootImports = roots.filter((name) => used.has(name));
      if (rootImports.length)
        imports.push(`import type { ${rootImports.join(', ')} } from '../schema';`);
    }
    for (const name of names) {
      if (name !== ownName && used.has(name)) {
        imports.push(
          `import type { ${name} } from '${filename === 'schema.d.ts' ? './parts/' : './'}${name}';`,
        );
      }
    }
    const formatted = await format(`${header}${imports.join('\n')}\n\n${body}\n`, {
      ...prettierConfig,
      filepath: filename,
    });
    if (lineCount(formatted) > 450) {
      throw new Error(`Generated declaration exceeds 450 lines: ${filename}`);
    }
    result.set(filename, formatted);
  }
  for (const [name, body] of bodies) await render(`parts/${name}.d.ts`, body, name);
  await render('schema.d.ts', facade.join('\n\n'));
  return result;
}
