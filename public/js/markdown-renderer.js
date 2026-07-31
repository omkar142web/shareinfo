(function () {
  var TRAILING_PUNCTUATION = /[.,!?;:)\]]+$/;
  var SKIP_LINKIFY_TAGS = new Set(['A', 'CODE', 'PRE', 'SCRIPT', 'STYLE', 'TEXTAREA']);
  var HTML_DOCUMENT_PATTERN = /^\s*(?:<!doctype\s+html\b|<html\b)/i;
  var HTML_STRUCTURE_PATTERN = /<(?:head|body|script|style|main|section|article|button|form|input|textarea|select|div|span|p|h[1-6]|ul|ol|li|table|nav|footer|header)\b[\s\S]*?>/i;
  var FENCED_CODE_PATTERN = /^\s*(```|~~~)/;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (char) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char];
    });
  }

  function trimTrailingPunctuation(value) {
    var trailing = '';
    var text = value;

    while (TRAILING_PUNCTUATION.test(text)) {
      trailing = text.slice(-1) + trailing;
      text = text.slice(0, -1);
    }

    return {
      text: text,
      trailing: trailing,
    };
  }

  function isProbablyFilePath(value) {
    return /^(?:\.{1,2}\/|\/(?!\/)|[a-z]:\\|\\\\)/i.test(value) || /\\/.test(value);
  }

  function isMostlyHtml(rawText) {
    var tagMatches = String(rawText ?? '').match(/<\/?[a-z][\w:-]*(?:\s[^<>]*)?>/gi) || [];
    if (tagMatches.length < 3) return false;

    var tagLength = tagMatches.reduce(function (total, tag) {
      return total + tag.length;
    }, 0);

    return tagLength / Math.max(String(rawText).trim().length, 1) > 0.18;
  }

  function shouldRenderAsHtmlCode(rawText) {
    var text = String(rawText ?? '');
    if (!text.trim() || FENCED_CODE_PATTERN.test(text)) return false;

    return HTML_DOCUMENT_PATTERN.test(text) ||
      (HTML_STRUCTURE_PATTERN.test(text) && isMostlyHtml(text));
  }

  function prepareMarkdownSource(text) {
    var rawText = String(text ?? '');
    if (!shouldRenderAsHtmlCode(rawText)) return rawText;

    return escapeHtml(rawText);
  }

  function getLinkifier() {
    var linkifyFactory = window.LinkifyItBundle && window.LinkifyItBundle.linkifyit;
    if (!linkifyFactory) return null;

    if (!window.shareInfoLinkifier) {
      window.shareInfoLinkifier = linkifyFactory({
        fuzzyEmail: true,
        fuzzyIP: true,
        fuzzyLink: true,
      });

      window.shareInfoLinkifier.tlds('site', true);

      window.shareInfoLinkifier.add('tel:', {
        validate: function (text, pos) {
          var tail = text.slice(pos);
          var match = tail.match(/^\+?[0-9][0-9().\-\s]{2,}[0-9]/);
          return match ? match[0].length : 0;
        },
        normalize: function (match) {
          match.url = match.raw;
        },
      });
    }

    return window.shareInfoLinkifier;
  }

  function normalizeHref(url, schema) {
    if (schema && /^(?:https?|ftp|mailto|tel):$/i.test(schema)) return url;
    if (!schema && /^http:\/\//i.test(url)) return url.replace(/^http:\/\//i, 'https://');
    if (/^(?:ftp|mailto|tel):/i.test(url)) return url;
    return 'https://' + url;
  }

  function addLocalUrlMatches(text, matches) {
    var localPattern = /(^|[^\w./\\:-])((?:localhost|\d{1,3}(?:\.\d{1,3}){3})(?::\d{1,5})?(?:\/[^\s<>"']*)?(?:\?[^\s<>"']*)?(?:#[^\s<>"']*)?)/gi;
    var match;

    while ((match = localPattern.exec(text)) !== null) {
      var prefix = match[1] || '';
      var raw = match[2];
      var start = match.index + prefix.length;
      var trimmed = trimTrailingPunctuation(raw);
      if (!trimmed.text) continue;

      matches.push({
        index: start,
        lastIndex: start + trimmed.text.length,
        raw: trimmed.text,
        text: trimmed.text,
        url: normalizeHref(trimmed.text, ''),
      });
    }
  }

  function getLinkMatches(text) {
    if (!text) return [];

    var linkifier = getLinkifier();
    var matches = linkifier ? (linkifier.match(text) || []) : [];
    matches = matches.map(function (match) {
      var trimmed = trimTrailingPunctuation(match.raw);
      return {
        index: match.index,
        lastIndex: match.index + trimmed.text.length,
        raw: trimmed.text,
        text: trimmed.text,
        url: normalizeHref(match.url, match.schema),
      };
    }).filter(function (match) {
      return match.raw && !isProbablyFilePath(match.raw);
    });

    addLocalUrlMatches(text, matches);

    return matches
      .sort(function (a, b) {
        return a.index - b.index || b.lastIndex - a.lastIndex;
      })
      .filter(function (match, index, sorted) {
        if (index === 0) return true;
        return match.index >= sorted[index - 1].lastIndex;
      });
  }

  function linkifyTextNode(node) {
    var text = node.nodeValue || '';
    var matches = getLinkMatches(text);
    if (!matches.length) return;

    var fragment = document.createDocumentFragment();
    var cursor = 0;

    matches.forEach(function (match) {
      if (match.index > cursor) {
        fragment.appendChild(document.createTextNode(text.slice(cursor, match.index)));
      }

      var link = document.createElement('a');
      link.className = 'inline-link';
      link.href = match.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = match.text;
      link.addEventListener('click', function (event) {
        event.stopPropagation();
      });
      fragment.appendChild(link);
      cursor = match.lastIndex;
    });

    if (cursor < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(cursor)));
    }

    node.parentNode.replaceChild(fragment, node);
  }

  function linkifyPlainText(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement;
        if (!parent || SKIP_LINKIFY_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return /\S/.test(node.nodeValue || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    var nodes = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach(linkifyTextNode);
  }

  function wrapTables(root) {
    root.querySelectorAll('table').forEach(function (table) {
      if (table.parentElement && table.parentElement.classList.contains('md-table-wrap')) return;
      var wrapper = document.createElement('div');
      wrapper.className = 'md-table-wrap';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  function ensureHighlightJS() {
    if (window.hljs) return Promise.resolve(window.hljs);

    return new Promise(function (resolve, reject) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/styles/github-dark.min.css';
      document.head.appendChild(link);

      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/lib/common.min.js';
      script.onload = function () { resolve(window.hljs); };
      script.onerror = function () { link.remove(); reject(new Error('highlight.js failed to load')); };
      document.head.appendChild(script);
    });
  }

  function enhanceCodeBlocks(root) {
    var blocks = root.querySelectorAll('.md-code-block, pre > code');
    if (!blocks.length) return;

    ensureHighlightJS().then(function (hljs) {
      blocks.forEach(function (el) {
        if (el.classList.contains('md-code-block')) {
          var langClass = null;
          el.classList.forEach(function (c) {
            if (c.indexOf('language-') === 0) langClass = c.slice(9);
          });
          var result = langClass
            ? hljs.highlight(el.textContent, { language: langClass })
            : hljs.highlightAuto(el.textContent);
          el.innerHTML = result.value;
          el.classList.add('hljs');
          if (result.language && !el.classList.contains('language-' + result.language)) {
            el.classList.add('language-' + result.language);
          }
        } else {
          hljs.highlightElement(el);
        }
      });

      root.dispatchEvent(new CustomEvent('markdown:highlighted', { bubbles: true, detail: root }));
    }).catch(function () {
      // Highlighting unavailable (e.g. CDN offline); content remains readable
    });
  }

  function renderMarkdown(text) {
    if (!window.marked || !window.DOMPurify) {
      return '<p>' + escapeHtml(text).replace(/\n/g, '<br>') + '</p>';
    }

    var renderer = new window.marked.Renderer();
    renderer.code = function (token) {
      var text = token.text || '';
      var lang = token.lang || '';
      var langAttr = lang ? ' language-' + escapeHtml(lang) : '';
      return '<div class="md-code-block' + langAttr + '">' + escapeHtml(text) + '</div>';
    };

    window.marked.setOptions({
      breaks: true,
      gfm: true,
      renderer: renderer,
    });

    var html = window.marked.parse(prepareMarkdownSource(text));
    return window.DOMPurify.sanitize(html, {
      ADD_TAGS: ['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g', 'defs', 'clipPath', 'use'],
      ADD_ATTR: ['target', 'rel', 'checked', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'rx', 'ry', 'points', 'x1', 'y1', 'x2', 'y2', 'xmlns', 'aria-hidden', 'aria-label', 'role'],
    });
  }

  window.renderMarkdown = renderMarkdown;
  window.enhanceMarkdownContent = function (container) {
    linkifyPlainText(container);
    wrapTables(container);
    enhanceCodeBlocks(container);
  };

  window.renderMarkdownInto = function (container, text) {
    container.innerHTML = renderMarkdown(text);
    container.querySelectorAll('a[href]').forEach(function (link) {
      link.classList.add('inline-link');
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.addEventListener('click', function (event) {
        event.stopPropagation();
      });
    });
    window.enhanceMarkdownContent(container);
  };
})();
