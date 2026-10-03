import type { ReactNode } from 'react'

const variablePattern = /(\[[A-Z][A-Z0-9_]*\])/g
const exactVariablePattern = /^\[[A-Z][A-Z0-9_]*\]$/

export function extractScriptVariables(text: string): string[] {
  return [...new Set(text.match(variablePattern) ?? [])]
}

export function highlightVariables(text: string): ReactNode[] {
  return text.split(variablePattern).map((part, index) => exactVariablePattern.test(part)
    ? <mark className="script-variable" key={`${index}-${part}`}>{part}</mark>
    : part)
}
