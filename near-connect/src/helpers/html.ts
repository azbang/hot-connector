export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const htmlTag = Symbol("htmlTag");

export interface HtmlString {
  [htmlTag]: string;
  html: string;
}

export function html(strings: TemplateStringsArray, ...values: any[]): HtmlString {
  let result = strings[0];

  for (let i = 0; i < values.length; i++) {
    for (const value of Array.isArray(values[i]) ? values[i] : [values[i]]) {
      const escaped = value?.[htmlTag] ? value[htmlTag] : escapeHtml(String(value ?? ""));
      result += escaped;
    }

    result += strings[i + 1];
  }

  return Object.freeze({
    [htmlTag]: result,
    get html() {
      return result;
    },
  });
}
