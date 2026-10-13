/**
 * Generates a standalone, import-free TypeScript file describing the CQRS
 * client API surface — `ClientAPI`, i.e. `InferClientAPI<CQRSHandlers>`
 * (`InferClientAPI` from `../generics.ts`, `CQRSHandlers` from
 * `../handlers.ts`) — plus the branded id / compound types it references,
 * for consumption by a client that lives outside this repo and therefore
 * can't import server types directly. `ClientAPISignature` isn't generated —
 * it's a pure function of `ClientAPI` (see `client/src/api/init-http.ts`),
 * so the client derives it locally instead.
 *
 * `generics.ts` only exports the generic `InferClientAPI` shape (not a
 * ready-made `ClientAPI` alias applying it to `CQRSHandlers`), so there's no
 * real source file to point the checker at for "the `ClientAPI` type" — this
 * generator supplies one itself: `ENTRY_SOURCE` below is a tiny synthetic
 * source file, fed into the program through a `CompilerHost` override
 * instead of written to disk, whose only job is `export type ClientAPI =
 * InferClientAPI<CQRSHandlers>`. From there it's resolved exactly like any
 * other type alias.
 *
 * Run via `bun run gen:client-api-types` (from `server/`).
 */

import path from 'node:path'
import prettier from 'prettier'
import ts from 'typescript'

const ROOT = path.resolve(import.meta.dirname, '..')
const GENERICS_FILE = path.join(ROOT, 'generics.ts')
const OUT_FILES = [
  path.join(ROOT, '../client/src/generated/client-api-types.ts'),
]

const ENTRY_FILE = path.join(ROOT, '__client-api-entry__.ts')
const ENTRY_SOURCE = `import type { InferClientAPI } from './generics'
import type { CQRSHandlers } from './handlers'

export type ClientAPI = InferClientAPI<CQRSHandlers>
`

const NB_FLAGS =
  ts.NodeBuilderFlags.NoTruncation |
  ts.NodeBuilderFlags.AllowUniqueESSymbolType |
  ts.NodeBuilderFlags.InTypeAlias

function loadProgram(): {
  program: ts.Program
  checker: ts.TypeChecker
  ownFileNames: readonly string[]
} {
  const configFile = ts.readConfigFile(
    path.join(ROOT, 'tsconfig.json'),
    ts.sys.readFile
  )
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ROOT)

  const host = ts.createCompilerHost(parsed.options)
  const baseGetSourceFile = host.getSourceFile.bind(host)
  const baseFileExists = host.fileExists.bind(host)
  const baseReadFile = host.readFile.bind(host)

  host.getSourceFile = (fileName, languageVersionOrOptions, ...rest) =>
    fileName === ENTRY_FILE
      ? ts.createSourceFile(
          fileName,
          ENTRY_SOURCE,
          languageVersionOrOptions,
          true,
          ts.ScriptKind.TS
        )
      : baseGetSourceFile(fileName, languageVersionOrOptions, ...rest)
  host.fileExists = (fileName) =>
    fileName === ENTRY_FILE || baseFileExists(fileName)
  host.readFile = (fileName) =>
    fileName === ENTRY_FILE ? ENTRY_SOURCE : baseReadFile(fileName)

  const program = ts.createProgram({
    rootNames: [ENTRY_FILE, ...parsed.fileNames],
    options: parsed.options,
    host,
  })

  return {
    program,
    checker: program.getTypeChecker(),
    ownFileNames: parsed.fileNames,
  }
}

function findTypeAlias(
  sourceFile: ts.SourceFile,
  name: string
): ts.TypeAliasDeclaration {
  let found: ts.TypeAliasDeclaration | undefined

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === name) {
      found = node
    }
  })

  if (!found) {
    throw new Error(`Type alias '${name}' not found in ${sourceFile.fileName}`)
  }

  return found
}

/**
 * Every non-generic type alias declared at the top level of a source file —
 * candidates for the "named types worth surfacing" pass. Not restricted to
 * exported aliases: e.g. `ContentCategory` in `projections/content-
 * categories.ts` is a module-private helper type, yet it's exactly the kind
 * of compound structure worth naming in the generated output. The
 * reachability filter (does this type's printed text actually occur in the
 * expanded client API text) is what keeps this safe — an unrelated local
 * type alias elsewhere in the program simply won't match and gets dropped.
 * Generic aliases are skipped: expanding one without concrete type
 * arguments would print its free type parameters, which can't sensibly be
 * named and will never match anything in the client API text anyway.
 */
function findTypeAliasCandidates(
  sourceFile: ts.SourceFile
): ts.TypeAliasDeclaration[] {
  const found: ts.TypeAliasDeclaration[] = []

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isTypeAliasDeclaration(node) && !node.typeParameters) {
      found.push(node)
    }
  })

  return found
}

function getSourceFileOrThrow(
  program: ts.Program,
  file: string
): ts.SourceFile {
  const sourceFile = program.getSourceFile(file)

  if (!sourceFile) {
    throw new Error(`Could not load source file: ${file}`)
  }

  return sourceFile
}

/**
 * Prints a type's fully expanded structural TypeNode, ignoring any alias
 * identity the type itself carries (so e.g. `ClientAPI` — a transparent
 * alias over the internal `InferClientAPI` helper — prints its expanded
 * mapped-type shape instead of a dangling `InferClientAPI<...>` reference).
 * `aliasSymbol`/`aliasTypeArguments` aren't part of the public `ts.Type`
 * API; this reaches past it deliberately, on a shallow clone so the
 * checker's own cached `Type` object is never mutated.
 */
function typeToNodeNoAlias(
  checker: ts.TypeChecker,
  type: ts.Type
): ts.TypeNode {
  const clone = Object.create(Object.getPrototypeOf(type)) as ts.Type
  Object.assign(clone, type)
  ;(clone as unknown as { aliasSymbol?: unknown }).aliasSymbol = undefined
  ;(clone as unknown as { aliasTypeArguments?: unknown }).aliasTypeArguments =
    undefined

  const node = checker.typeToTypeNode(clone, undefined, NB_FLAGS)

  if (!node) {
    throw new Error('typeToTypeNode returned undefined')
  }

  return node
}

function isGlobalLibSymbol(program: ts.Program, symbol: ts.Symbol): boolean {
  const decl = symbol.declarations?.[0]

  if (!decl) return true

  return program.isSourceFileDefaultLibrary(decl.getSourceFile())
}

function referenceSymbol(node: ts.TypeReferenceNode): ts.Symbol | undefined {
  const idNode = ts.isIdentifier(node.typeName)
    ? node.typeName
    : node.typeName.right

  return (idNode as unknown as { symbol?: ts.Symbol }).symbol
}

/**
 * Detects `Pick<ForeignSymbol, 'lit1' | 'lit2' | ...>` so it can be handled
 * without expanding `ForeignSymbol`'s full type. Needed because this
 * codebase's one real case (`Pick<InvalidSubject, 'code' | 'path'>`) narrows
 * away schematox's `InvalidSubject.schema`, which is itself a genuinely
 * self-recursive validator-DSL type (`Schema`) — fully expanding
 * `InvalidSubject` before narrowing would recurse forever.
 */
function asForeignPick(
  program: ts.Program,
  node: ts.TypeNode
): { subjectSymbol: ts.Symbol; keys: string[] } | undefined {
  if (!ts.isTypeReferenceNode(node)) return undefined
  if (!ts.isIdentifier(node.typeName) || node.typeName.text !== 'Pick') {
    return undefined
  }

  const [subjectArg, keysArg] = node.typeArguments ?? []
  if (!subjectArg || !keysArg || !ts.isTypeReferenceNode(subjectArg)) {
    return undefined
  }

  const subjectSymbol = referenceSymbol(subjectArg)
  if (!subjectSymbol || isGlobalLibSymbol(program, subjectSymbol)) {
    return undefined
  }

  const keys: string[] = []
  const literalNodes = ts.isUnionTypeNode(keysArg) ? keysArg.types : [keysArg]

  for (const literalNode of literalNodes) {
    if (
      !ts.isLiteralTypeNode(literalNode) ||
      !ts.isStringLiteral(literalNode.literal)
    ) {
      return undefined
    }
    keys.push(literalNode.literal.text)
  }

  return { subjectSymbol, keys }
}

function buildNarrowedPickReplacement(
  checker: ts.TypeChecker,
  subjectSymbol: ts.Symbol,
  keys: string[]
): ts.TypeNode {
  const subjectType = checker.getDeclaredTypeOfSymbol(subjectSymbol)

  const members = keys.map((key) => {
    const propSymbol = checker.getPropertyOfType(subjectType, key)
    if (!propSymbol) {
      throw new Error(
        `Property '${key}' not found on '${subjectSymbol.name}' while narrowing Pick<>`
      )
    }
    const propType = checker.getTypeOfSymbol(propSymbol)

    return ts.factory.createPropertySignature(
      undefined,
      ts.factory.createIdentifier(key),
      undefined,
      typeToNodeNoAlias(checker, propType)
    )
  })

  return ts.factory.createTypeLiteralNode(members)
}

/**
 * Recursively rewrites a printed TypeNode tree, replacing every reference to
 * a non-global-lib symbol with that symbol's own fully expanded structural
 * form, until nothing foreign remains. Throws on a genuine cycle rather than
 * looping forever or silently degrading output — a real cycle means a
 * source type is self-recursive and needs narrowing at the source (as was
 * done for `InvalidSubject`/`Schema`), not blind inlining. Also throws on a
 * generic alias referenced with type arguments (other than the `Pick<>`
 * special case above) — expanding those correctly would need to substitute
 * the type arguments in, which this generator doesn't do yet.
 */
function expand(
  program: ts.Program,
  checker: ts.TypeChecker,
  node: ts.TypeNode,
  inProgress: Set<ts.Symbol>
): ts.TypeNode {
  const transformerFactory: ts.TransformerFactory<ts.Node> = (context) => {
    const visitor: ts.Visitor = (n): ts.Node => {
      const foreignPick = ts.isTypeNode(n)
        ? asForeignPick(program, n)
        : undefined

      if (foreignPick) {
        return buildNarrowedPickReplacement(
          checker,
          foreignPick.subjectSymbol,
          foreignPick.keys
        )
      }

      if (ts.isTypeReferenceNode(n)) {
        const symbol = referenceSymbol(n)

        if (symbol && !isGlobalLibSymbol(program, symbol)) {
          if (n.typeArguments && n.typeArguments.length > 0) {
            throw new Error(
              `'${symbol.name}' is a generic type alias referenced with ` +
                'type arguments — the generator only expands plain aliases ' +
                "and 'Pick<>'. Narrow it at the source, or extend the " +
                'generator to handle it.'
            )
          }

          if (inProgress.has(symbol)) {
            throw new Error(
              `Cycle detected expanding '${symbol.name}' — this type is ` +
                'genuinely self-referential and cannot be fully inlined. ' +
                'Narrow it at the source, or extend the generator to name ' +
                'it instead of inlining it.'
            )
          }

          inProgress.add(symbol)
          const expanded = expand(
            program,
            checker,
            typeToNodeNoAlias(checker, checker.getDeclaredTypeOfSymbol(symbol)),
            inProgress
          )
          inProgress.delete(symbol)

          return expanded
        }
      }

      return ts.visitEachChild(n, visitor, context)
    }

    return (root) => ts.visitNode(root, visitor) as ts.Node
  }

  const result = ts.transform(node, [transformerFactory])
  const [transformed] = result.transformed
  result.dispose()

  return transformed as ts.TypeNode
}

function fullyExpandAlias(
  program: ts.Program,
  checker: ts.TypeChecker,
  aliasDecl: ts.TypeAliasDeclaration
): ts.TypeNode {
  const type = checker.getTypeAtLocation(aliasDecl.name)

  return expand(program, checker, typeToNodeNoAlias(checker, type), new Set())
}

function printType(node: ts.TypeNode, printFile: ts.SourceFile): string {
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })

  return printer.printNode(ts.EmitHint.Unspecified, node, printFile)
}

function substituteNamed(
  text: string,
  substitutions: ReadonlyArray<{ name: string; text: string }>
): string {
  let result = text

  for (const { name, text: pattern } of substitutions) {
    result = result.split(pattern).join(name)
  }

  return result
}

const TRIVIAL_KEYWORD_KINDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.StringKeyword,
  ts.SyntaxKind.NumberKeyword,
  ts.SyntaxKind.BooleanKeyword,
  ts.SyntaxKind.AnyKeyword,
  ts.SyntaxKind.UnknownKeyword,
  ts.SyntaxKind.NeverKeyword,
  ts.SyntaxKind.VoidKeyword,
  ts.SyntaxKind.UndefinedKeyword,
  ts.SyntaxKind.NullKeyword,
  ts.SyntaxKind.BigIntKeyword,
  ts.SyntaxKind.SymbolKeyword,
  ts.SyntaxKind.ObjectKeyword,
])

/**
 * A bare keyword or single literal (e.g. a branded id whose `.brand()` call
 * was skipped, resolving to plain `number`) is too generic to safely name by
 * text substitution — its printed text would coincidentally match unrelated
 * occurrences elsewhere in the output (every other numeric field, say) and
 * corrupt them. Every real branded id / compound type in this codebase
 * expands to something more structured (an intersection, object, or union),
 * so this only ever filters out the genuinely unsafe case.
 */
function isTooTrivialToName(node: ts.TypeNode): boolean {
  return TRIVIAL_KEYWORD_KINDS.has(node.kind) || ts.isLiteralTypeNode(node)
}

/**
 * Independently resolves every non-generic type alias declared anywhere in
 * the program's own source files, and keeps only the ones whose printed text
 * is a genuine *sub-structure* of the expanded client API text — this is
 * what lets a brand-new branded id or compound type, declared anywhere, be
 * picked up automatically without editing this generator.
 *
 * A candidate whose text exactly equals the *entire* client API text is
 * rejected rather than kept: nothing prevents some other file from also
 * declaring `type ClientAPI = InferClientAPI<CQRSHandlers>` (or any other
 * alias that happens to expand to the same full shape) — admin-PoC's
 * `http.ts` does exactly this — and naming "the whole thing" as one of its
 * own named parts would make `substituteNamed` rewrite the entire output to
 * its own name (`export type ClientAPI = ClientAPI`).
 */
function discoverNamedTypes(
  program: ts.Program,
  checker: ts.TypeChecker,
  ownFileNames: readonly string[],
  printFile: ts.SourceFile,
  clientApiText: string
): Array<{ name: string; text: string }> {
  const candidateFiles = ownFileNames.filter(
    (file) => file !== GENERICS_FILE && !OUT_FILES.includes(file)
  )

  const byName = new Map<string, string>()

  for (const file of candidateFiles) {
    const sourceFile = getSourceFileOrThrow(program, file)

    for (const decl of findTypeAliasCandidates(sourceFile)) {
      const symbol = checker.getSymbolAtLocation(decl.name)
      if (!symbol) continue

      let node: ts.TypeNode
      try {
        node = expand(
          program,
          checker,
          typeToNodeNoAlias(checker, checker.getDeclaredTypeOfSymbol(symbol)),
          new Set()
        )
      } catch {
        // Not reachable from the client API — a candidate that can't be
        // resolved (e.g. a foreign-cycle-adjacent type unrelated to
        // ClientAPI) is simply not nameable, not a fatal error.
        continue
      }

      if (isTooTrivialToName(node)) continue

      const text = printType(node, printFile)
      if (text === clientApiText || !clientApiText.includes(text)) continue

      const existing = byName.get(decl.name.text)
      if (existing !== undefined && existing !== text) {
        throw new Error(
          `Two different types are both named '${decl.name.text}' — the ` +
            'generator assumes named types are unique by name across the ' +
            'whole program.'
        )
      }

      byName.set(decl.name.text, text)
    }
  }

  return [...byName.entries()]
    .map(([name, text]) => ({ name, text }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function main() {
  const { program, checker, ownFileNames } = loadProgram()
  const printFile = ts.createSourceFile(
    'client-api-types.ts',
    '',
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS
  )

  const entrySourceFile = getSourceFileOrThrow(program, ENTRY_FILE)
  const clientApiNode = fullyExpandAlias(
    program,
    checker,
    findTypeAlias(entrySourceFile, 'ClientAPI')
  )

  const clientApiText = printType(clientApiNode, printFile)

  const named = discoverNamedTypes(
    program,
    checker,
    ownFileNames,
    printFile,
    clientApiText
  )

  const byLengthDesc = [...named].sort((a, b) => b.text.length - a.text.length)

  const finalClientApi = substituteNamed(clientApiText, byLengthDesc)

  const namedDeclarations = named
    .map(({ name, text }) => {
      const others = byLengthDesc.filter((entry) => entry.name !== name)
      return `export type ${name} = ${substituteNamed(text, others)}`
    })
    .join('\n\n')

  const header = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: bun run gen:client-api-types (from server/), or
 * bun run gen from the repo root.
 */

`

  const body =
    header +
    namedDeclarations +
    `\n\nexport type ClientAPI = ${finalClientApi}\n`

  const config = await prettier.resolveConfig(OUT_FILES[0])
  const formatOptions = { ...config, parser: 'typescript' as const }
  // A single pass over the raw printer output isn't a fixed point: prettier
  // preserves some of the TS printer's own line breaks on the first pass,
  // then collapses them on a second pass once the source is already
  // prettier-formatted. Format twice so the written file matches what
  // `prettier --check` (a single pass over already-formatted input) expects.
  const firstPass = await prettier.format(body, formatOptions)
  const formatted = await prettier.format(firstPass, formatOptions)

  await Promise.all(OUT_FILES.map((file) => Bun.write(file, formatted)))
}

await main()
