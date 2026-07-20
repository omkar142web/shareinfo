import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({
  breaks: true,
  gfm: true,
  mangle: false,
  headerIds: false,
});

const HTML_DOCUMENT_PATTERN = /^\s*(?:<!doctype\s+html\b|<html\b)/i;
const HTML_STRUCTURE_PATTERN = /<(?:head|body|script|style|main|section|article|button|form|input|textarea|select|div|span|p|h[1-6]|ul|ol|li|table|nav|footer|header)\b[\s\S]*?>/i;
const FENCED_CODE_PATTERN = /^\s*(```|~~~)/;

const allowedTags = sanitizeHtml.defaults.allowedTags.concat([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "img",
  "del",
  "input",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "pre",
  "code",
]);

const allowedAttributes = {
  ...sanitizeHtml.defaults.allowedAttributes,
  a: ["href", "name", "target", "rel", "class"],
  code: ["class"],
  input: ["type", "checked", "disabled"],
  img: ["src", "alt", "title", "width", "height", "loading"],
  th: ["align"],
  td: ["align"],
};

function isMostlyHtml(rawText) {
  const tagMatches = rawText.match(/<\/?[a-z][\w:-]*(?:\s[^<>]*)?>/gi) || [];
  if (tagMatches.length < 3) return false;

  const tagLength = tagMatches.reduce((total, tag) => total + tag.length, 0);
  return tagLength / Math.max(rawText.trim().length, 1) > 0.18;
}

function shouldRenderAsHtmlCode(rawText) {
  const text = String(rawText ?? "");
  if (!text.trim() || FENCED_CODE_PATTERN.test(text)) return false;

  return (
    HTML_DOCUMENT_PATTERN.test(text) ||
    (HTML_STRUCTURE_PATTERN.test(text) && isMostlyHtml(text))
  );
}

function prepareMarkdownSource(text = "") {
  const rawText = String(text ?? "");
  if (!shouldRenderAsHtmlCode(rawText)) return rawText;

  const fence = rawText.includes("```") ? "~~~" : "```";
  return `${fence}html\n${rawText}\n${fence}`;
}

export function renderMarkdown(text = "") {
  const html = marked.parse(prepareMarkdownSource(text));

  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ["http", "https", "ftp", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
        class: "inline-link",
      }),
      input: sanitizeHtml.simpleTransform("input", {
        disabled: "disabled",
      }),
      img: sanitizeHtml.simpleTransform("img", {
        loading: "lazy",
      }),
    },
  });
}
