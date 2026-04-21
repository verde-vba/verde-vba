import type { languages } from "monaco-editor";

export const VBA_LANGUAGE_ID = "vba";

// Sprint 31.G: Monarch tokenizer was removed in favour of the
// tree-sitter-vba semantic-tokens provider (single grammar truth source).
// Only the brackets / folding / comment / indentation behaviour remains
// here, since these don't depend on the WASM artifact.
export const vbaLanguageConfig: languages.LanguageConfiguration = {
  comments: {
    lineComment: "'",
  },
  brackets: [["(", ")"]],
  autoClosingPairs: [
    { open: "(", close: ")" },
    { open: '"', close: '"' },
  ],
  surroundingPairs: [
    { open: "(", close: ")" },
    { open: '"', close: '"' },
  ],
  folding: {
    markers: {
      start: /^\s*(Sub|Function|Property|If|For|Do|While|Select|With|Type|Enum)\b/i,
      end: /^\s*(End\s+(Sub|Function|Property|If|Select|With|Type|Enum)|Next|Loop|Wend)\b/i,
    },
  },
  indentationRules: {
    increaseIndentPattern:
      /^\s*(Sub|Function|Property|If|ElseIf|Else|For|Do|While|Select|With|Type|Enum)\b/i,
    decreaseIndentPattern:
      /^\s*(End\s+(Sub|Function|Property|If|Select|With|Type|Enum)|Next|Loop|Wend|ElseIf|Else|Case)\b/i,
  },
};

export function registerVbaLanguage(monaco: typeof import("monaco-editor")) {
  monaco.languages.register({ id: VBA_LANGUAGE_ID });
  monaco.languages.setLanguageConfiguration(VBA_LANGUAGE_ID, vbaLanguageConfig);
}
