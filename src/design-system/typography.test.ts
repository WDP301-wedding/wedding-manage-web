import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

function filesWithExtension(directory: string, extension = '.css'): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? filesWithExtension(path, extension)
      : entry.name.endsWith(extension)
        ? [path]
        : [];
  });
}

function styleRules(rules: CSSRuleList): CSSStyleRule[] {
  return Array.from(rules).flatMap((rule) => {
    if ('selectorText' in rule && 'style' in rule) return [rule as CSSStyleRule];
    if ('cssRules' in rule) return styleRules((rule as CSSGroupingRule).cssRules);
    return [];
  });
}

describe('Vietnamese typography policy', () => {
  it('limits decorative wordmarks to static ASCII text marked as English', () => {
    const violations: string[] = [];
    const files = ['app', 'src'].flatMap((directory) =>
      filesWithExtension(join(process.cwd(), directory), '.tsx'),
    );
    for (const file of files) {
      const source = ts.createSourceFile(
        file,
        readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      const visit = (node: ts.Node) => {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const attribute = (name: string) =>
            node.attributes.properties.find(
              (property): property is ts.JsxAttribute =>
                ts.isJsxAttribute(property) &&
                ts.isIdentifier(property.name) &&
                property.name.text === name,
            );
          const stringValue = (value: ts.JsxAttribute | undefined) => {
            const initializer = value?.initializer;
            if (initializer && ts.isStringLiteral(initializer)) return initializer.text;
            if (
              initializer &&
              ts.isJsxExpression(initializer) &&
              initializer.expression &&
              ts.isStringLiteral(initializer.expression)
            )
              return initializer.expression.text;
            return '';
          };
          if (stringValue(attribute('className')).split(/\s+/).includes('latin-wordmark')) {
            const location =
              relative(process.cwd(), file) +
              ':' +
              (source.getLineAndCharacterOfPosition(node.getStart()).line + 1);
            if (stringValue(attribute('lang')) !== 'en')
              violations.push(location + ' → wordmarks require lang="en"');
            if (
              !ts.isJsxElement(node.parent) ||
              node.parent.children.some(
                (child) =>
                  !ts.isJsxText(child) ||
                  [...child.text].some((character) => character.charCodeAt(0) > 127),
              )
            ) {
              violations.push(
                location + ' → wordmarks cannot contain translated, nested or dynamic text',
              );
            }
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(violations).toEqual([]);
  });

  it('keeps Vietnamese font tokens on a complete sans-serif fallback stack', () => {
    const element = document.createElement('style');
    element.textContent = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
    document.head.append(element);
    try {
      const root = styleRules(element.sheet!.cssRules).find(
        (rule) => rule.selectorText === ':root',
      )!;
      for (const token of ['--font-display', '--font-body', '--font-script']) {
        const fonts = root.style
          .getPropertyValue(token)
          .split(',')
          .map((font) => font.trim().replace(/['"]/g, '').toLowerCase());
        expect(fonts, token).toEqual(['be vietnam pro', 'segoe ui', 'arial', 'sans-serif']);
      }
    } finally {
      element.remove();
    }
  });

  it('rejects serif overrides, tracking and CSS case conversion outside Latin wordmarks', () => {
    const violations: string[] = [];
    const files = ['app', 'src'].flatMap((directory) =>
      filesWithExtension(join(process.cwd(), directory)),
    );
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const element = document.createElement('style');
      element.textContent = readFileSync(file, 'utf8');
      document.head.append(element);
      try {
        for (const rule of styleRules(element.sheet!.cssRules)) {
          const location = relative(process.cwd(), file) + ': ' + rule.selectorText;
          const latinOnly = rule.selectorText
            .split(',')
            .every((selector) => selector.trim() === '.latin-wordmark');
          const font = rule.style.getPropertyValue('font-family').trim();
          if (
            font &&
            ![
              'inherit',
              'var(--font-display)',
              'var(--font-body)',
              'var(--font-script)',
              'var(--font-code)',
            ].includes(font) &&
            !(latinOnly && font === 'var(--font-wordmark)')
          ) {
            violations.push(location + ' → font-family: ' + font);
          }
          const shorthand = rule.style.getPropertyValue('font').trim();
          if (shorthand && shorthand !== 'inherit')
            violations.push(location + ' → use font tokens instead of font shorthand');
          const spacing = rule.style.getPropertyValue('letter-spacing').trim();
          if (!latinOnly && spacing && !/^(?:normal|0(?:px|em|rem)?)$/.test(spacing))
            violations.push(location + ' → letter-spacing: ' + spacing);
          const lineHeight = rule.style.getPropertyValue('line-height').trim();
          if (
            !latinOnly &&
            /\bh[1-6]\b/.test(rule.selectorText) &&
            /^\d+(?:\.\d+)?$/.test(lineHeight) &&
            Number(lineHeight) < 1.25
          )
            violations.push(
              location + ' → heading line-height must allow Vietnamese diacritics: ' + lineHeight,
            );
          const transform = rule.style.getPropertyValue('text-transform').trim();
          if (!latinOnly && transform && transform !== 'none')
            violations.push(location + ' → text-transform: ' + transform);
        }
      } finally {
        element.remove();
      }
    }
    expect(
      violations,
      'Use Vietnamese font tokens; decorative styles require an explicitly Latin-only wordmark.',
    ).toEqual([]);
  });
});
