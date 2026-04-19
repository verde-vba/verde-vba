import type { languages } from "monaco-editor";

export const VBA_LANGUAGE_ID = "vba";

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

export const vbaTokensProvider: languages.IMonarchLanguage = {
  defaultToken: "",
  ignoreCase: true,

  keywords: [
    "And", "As", "Boolean", "ByRef", "ByVal", "Byte", "Call", "Case",
    "Const", "Currency", "Date", "Declare", "Dim", "Do", "Double",
    "Each", "Else", "ElseIf", "End", "Enum", "Erase", "Error", "Event",
    "Exit", "False", "For", "Friend", "Function", "Get", "GoSub",
    "GoTo", "If", "Implements", "In", "Integer", "Is", "Let", "Lib",
    "Like", "Long", "LongLong", "LongPtr", "Loop", "LSet", "Me", "Mod",
    "New", "Next", "Not", "Nothing", "Null", "Object", "On", "Option",
    "Optional", "Or", "ParamArray", "Preserve", "Print", "Private",
    "Property", "Public", "RaiseEvent", "ReDim", "Rem", "Resume",
    "Return", "RSet", "Select", "Set", "Single", "Static", "Step",
    "Stop", "String", "Sub", "Then", "To", "True", "Type", "TypeOf",
    "Until", "Variant", "Wend", "While", "With", "WithEvents", "Xor",
  ],

  builtinFunctions: [
    "Abs", "Array", "Asc", "CBool", "CByte", "CCur", "CDate", "CDbl",
    "CDec", "Chr", "CInt", "CLng", "CLngLng", "CLngPtr", "CSng", "CStr",
    "CVar", "DateAdd", "DateDiff", "DatePart", "DateSerial", "DateValue",
    "Day", "Dir", "Environ", "EOF", "Format", "FreeFile", "Hex",
    "Hour", "IIf", "InStr", "InStrRev", "InputBox", "Int", "IsArray",
    "IsDate", "IsEmpty", "IsError", "IsMissing", "IsNull", "IsNumeric",
    "IsObject", "Join", "LBound", "LCase", "Left", "Len", "Log",
    "LTrim", "Mid", "Minute", "Month", "MonthName", "MsgBox", "Now",
    "Oct", "Replace", "RGB", "Right", "Rnd", "Round", "RTrim",
    "Second", "Sgn", "Shell", "Space", "Split", "Sqr", "Str",
    "StrComp", "StrConv", "String", "Timer", "TimeSerial", "TimeValue",
    "Trim", "TypeName", "UBound", "UCase", "Val", "VarType",
    "Weekday", "WeekdayName", "Year",
  ],

  tokenizer: {
    root: [
      [/'.*$/, "comment"],
      [/[Rr][Ee][Mm]\s.*$/, "comment"],

      [/"[^"]*"/, "string"],

      [/\b\d+\.?\d*([eE][+-]?\d+)?\b/, "number"],
      [/#\d{1,2}\/\d{1,2}\/\d{2,4}#/, "number.date"],
      [/&[hH][0-9a-fA-F]+&?/, "number.hex"],

      [
        /[a-zA-Z_]\w*/,
        {
          cases: {
            "@keywords": "keyword",
            "@builtinFunctions": "predefined",
            "@default": "identifier",
          },
        },
      ],

      [/[=<>!]+/, "operator"],
      [/[+\-*/\\^&]/, "operator"],

      [/[(),.]/, "delimiter"],
    ],
  },
};

export function registerVbaLanguage(monaco: typeof import("monaco-editor")) {
  monaco.languages.register({ id: VBA_LANGUAGE_ID });
  monaco.languages.setMonarchTokensProvider(VBA_LANGUAGE_ID, vbaTokensProvider);
  monaco.languages.setLanguageConfiguration(VBA_LANGUAGE_ID, vbaLanguageConfig);
}
