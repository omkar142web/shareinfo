(function () {
  var TRAILING_PUNCTUATION = /[.,!?;:)\]]+$/;
  var SKIP_LINKIFY_TAGS = new Set(['A', 'CODE', 'PRE', 'SCRIPT', 'STYLE', 'TEXTAREA']);

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

  function getLinkifier() {
    var linkifyFactory = window.LinkifyItBundle && window.LinkifyItBundle.linkifyit;
    if (!linkifyFactory) return null;

    if (!window.shareInfoLinkifier) {
      window.shareInfoLinkifier = linkifyFactory({
        fuzzyEmail: true,
        fuzzyIP: true,
        fuzzyLink: true,
      });

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

  function enhanceCodeBlocks(root) {
    root.querySelectorAll('pre > code').forEach(function (code) {
      if (window.hljs) {
        window.hljs.highlightElement(code);
      }

      var pre = code.parentElement;
      if (!pre || pre.querySelector('.md-copy-code')) return;

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'md-copy-code';
      button.textContent = 'Copy';
      button.addEventListener('click', function (event) {
        event.stopPropagation();
        var text = code.textContent || '';
        var done = function () {
          button.textContent = 'Copied';
          setTimeout(function () {
            button.textContent = 'Copy';
          }, 1200);
        };

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(done).catch(function () {});
          return;
        }

        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
        done();
      });
      pre.appendChild(button);
    });
  }

  function renderMarkdown(text) {
    if (!window.marked || !window.DOMPurify) {
      return '<p>' + escapeHtml(text).replace(/\n/g, '<br>') + '</p>';
    }

    window.marked.setOptions({
      breaks: true,
      gfm: true,
    });

    var html = window.marked.parse(String(text ?? ''));
    return window.DOMPurify.sanitize(html, {
      ADD_ATTR: ['target', 'rel', 'checked'],
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
