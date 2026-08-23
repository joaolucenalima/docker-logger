import type { CSSProperties, ReactNode } from "react";

type AnsiState = {
  foreground?: string;
  background?: string;
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  inverse: boolean;
  hidden: boolean;
};

// biome-ignore lint/complexity/useRegexLiterals: constructing the pattern avoids embedding control characters in source.
const ANSI_PATTERN = new RegExp(
  String.raw`\u001B\[([0-9;]*)m|\u001B\][^\u0007]*(?:\u0007|\u001B\\)|\u001B\[[0-?]*[ -/]*[@-~]|\u001B[ -/]*[@-~]`,
  "g",
);
const ANSI_COLORS = [
  "#18181b",
  "#ef4444",
  "#22c55e",
  "#eab308",
  "#3b82f6",
  "#d946ef",
  "#06b6d4",
  "#d4d4d8",
  "#71717a",
  "#f87171",
  "#4ade80",
  "#facc15",
  "#60a5fa",
  "#e879f9",
  "#22d3ee",
  "#fafafa",
] as const;

function initialState(): AnsiState {
  return {
    foreground: undefined,
    background: undefined,
    bold: false,
    dim: false,
    italic: false,
    underline: false,
    strike: false,
    inverse: false,
    hidden: false,
  };
}

function ansi256Color(index: number) {
  const normalizedIndex = Math.max(0, Math.min(255, index));

  if (normalizedIndex < 16) return ANSI_COLORS[normalizedIndex];

  if (normalizedIndex < 232) {
    const value = normalizedIndex - 16;
    const channel = (part: number) => (part === 0 ? 0 : 55 + part * 40);
    const red = channel(Math.floor(value / 36));
    const green = channel(Math.floor((value % 36) / 6));
    const blue = channel(value % 6);
    return `rgb(${red} ${green} ${blue})`;
  }

  const gray = 8 + (normalizedIndex - 232) * 10;
  return `rgb(${gray} ${gray} ${gray})`;
}

function extendedColor(codes: number[], index: number) {
  if (codes[index + 1] === 5 && codes[index + 2] !== undefined) {
    return { color: ansi256Color(codes[index + 2]), consumed: 2 };
  }

  if (
    codes[index + 1] === 2 &&
    codes[index + 2] !== undefined &&
    codes[index + 3] !== undefined &&
    codes[index + 4] !== undefined
  ) {
    const channels = codes
      .slice(index + 2, index + 5)
      .map((value) => Math.max(0, Math.min(255, value)));
    return {
      color: `rgb(${channels[0]} ${channels[1]} ${channels[2]})`,
      consumed: 4,
    };
  }

  return { color: undefined, consumed: 0 };
}

function applyCodes(state: AnsiState, codes: number[]) {
  for (let index = 0; index < codes.length; index++) {
    const code = codes[index] ?? 0;

    if (code === 0) Object.assign(state, initialState());
    else if (code === 1) state.bold = true;
    else if (code === 2) state.dim = true;
    else if (code === 3) state.italic = true;
    else if (code === 4) state.underline = true;
    else if (code === 7) state.inverse = true;
    else if (code === 8) state.hidden = true;
    else if (code === 9) state.strike = true;
    else if (code === 22) {
      state.bold = false;
      state.dim = false;
    } else if (code === 23) state.italic = false;
    else if (code === 24) state.underline = false;
    else if (code === 27) state.inverse = false;
    else if (code === 28) state.hidden = false;
    else if (code === 29) state.strike = false;
    else if (code >= 30 && code <= 37)
      state.foreground = ANSI_COLORS[code - 30];
    else if (code === 39) state.foreground = undefined;
    else if (code >= 40 && code <= 47)
      state.background = ANSI_COLORS[code - 40];
    else if (code === 49) state.background = undefined;
    else if (code >= 90 && code <= 97)
      state.foreground = ANSI_COLORS[code - 82];
    else if (code >= 100 && code <= 107)
      state.background = ANSI_COLORS[code - 92];
    else if (code === 38 || code === 48) {
      const result = extendedColor(codes, index);
      if (code === 38) state.foreground = result.color;
      else state.background = result.color;
      index += result.consumed;
    }
  }
}

function stateStyle(state: AnsiState): CSSProperties {
  const foreground = state.inverse ? state.background : state.foreground;
  const background = state.inverse ? state.foreground : state.background;

  return {
    color: foreground,
    backgroundColor: background,
    fontWeight: state.bold ? 700 : undefined,
    fontStyle: state.italic ? "italic" : undefined,
    opacity: state.hidden ? 0 : state.dim ? 0.65 : undefined,
    textDecoration:
      [state.underline && "underline", state.strike && "line-through"]
        .filter(Boolean)
        .join(" ") || undefined,
  };
}

export function AnsiText({ children }: { children: string }) {
  const state = initialState();
  const output: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of children.matchAll(ANSI_PATTERN)) {
    if (match.index > cursor) {
      output.push(
        <span key={key++} style={stateStyle(state)}>
          {children.slice(cursor, match.index)}
        </span>,
      );
    }

    if (match[1] !== undefined) {
      applyCodes(
        state,
        match[1] === "" ? [0] : match[1].split(";").map(Number),
      );
    }
    cursor = match.index + match[0].length;
  }

  if (cursor < children.length) {
    output.push(
      <span key={key} style={stateStyle(state)}>
        {children.slice(cursor)}
      </span>,
    );
  }

  return output;
}
