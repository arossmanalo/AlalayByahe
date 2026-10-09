import ts from "typescript";

/** Inspect executable syntax, not comments or fixture-warning copy. */
export function forbiddenReleaseImports(filename: string, source: string): string[] {
  const problems = new Set<string>();
  const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true,
    filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const checkSpecifier = (node: ts.Node | undefined) => {
    if (node && ts.isStringLiteral(node)
      && /(^|\/)(tests?|test[-_]fixtures?)(\/|\.|$)/i.test(node.text.replaceAll("\\", "/"))) {
      problems.add("test/fixture import: " + node.text);
    }
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) checkSpecifier(node.moduleSpecifier);
    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword
        || ts.isIdentifier(node.expression) && node.expression.text === "require") checkSpecifier(node.arguments[0]);
      if (ts.isIdentifier(node.expression) && node.expression.text === "createDevFixtureServices") {
        problems.add("development fixture provider");
      }
    }
    if (ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
      && node.name.text === "kind" && ts.isStringLiteral(node.initializer) && node.initializer.text === "dev_fixture") {
      problems.add("development fixture service wiring");
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return [...problems];
}
