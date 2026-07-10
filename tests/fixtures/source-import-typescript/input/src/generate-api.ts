import ts from "typescript";

export function createProgram() {
  return ts.createProgram([], {});
}
