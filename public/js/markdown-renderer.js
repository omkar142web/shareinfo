(function () {
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
