/**
 * Clariora Exam Simulator v3.2.0
 * markdown-renderer.js - Lightweight, Zero-Dependency, Secure Markdown & Alert Parser
 * File: js/markdown-renderer.js
 */

(function(window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  function escapeHTML(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const MarkdownRenderer = {
    /**
     * Parse markdown text and return styled HTML string.
     * @param {string} md - Markdown content
     * @returns {string} - Rendered HTML
     */
    render(md) {
      if (!md || typeof md !== 'string') return '';

      // Normalize line breaks
      let src = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      // 1. Extract fenced code blocks first to protect their contents
      const codeBlocks = [];
      src = src.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const placeholder = `%%CODE_BLOCK_${codeBlocks.length}%%`;
        codeBlocks.push({ lang: lang || 'text', code });
        return placeholder;
      });

      // 2. Extract block math $$...$$
      const mathBlocks = [];
      src = src.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
        const placeholder = `%%MATH_BLOCK_${mathBlocks.length}%%`;
        mathBlocks.push(math.trim());
        return placeholder;
      });

      // 3. Process tables
      const tableResult = this._renderTables(src);
      src = tableResult.text;
      const tableBlocks = tableResult.tableBlocks;

      // Split into lines for block processing
      const lines = src.split('\n');
      const out = [];
      let inList = false;
      let listType = 'ul';
      let inBlockquote = false;
      let blockquoteBuffer = [];

      const flushList = () => {
        if (inList) {
          out.push(`</${listType}>`);
          inList = false;
        }
      };

      const flushBlockquote = () => {
        if (inBlockquote) {
          out.push(this._renderBlockquote(blockquoteBuffer.join('\n')));
          inBlockquote = false;
          blockquoteBuffer = [];
        }
      };

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Code block placeholder
        if (/^%%CODE_BLOCK_\d+%%$/.test(line.trim())) {
          flushList();
          flushBlockquote();
          out.push(line.trim());
          continue;
        }

        // Table rendered block placeholder
        if (/^%%TABLE_BLOCK_\d+%%$/.test(line.trim())) {
          flushList();
          flushBlockquote();
          out.push(line.trim());
          continue;
        }

        // Math block placeholder
        if (/^%%MATH_BLOCK_\d+%%$/.test(line.trim())) {
          flushList();
          flushBlockquote();
          out.push(line.trim());
          continue;
        }

        // Blockquotes (e.g. > quote or > [!NOTE])
        if (/^>\s?/.test(line)) {
          flushList();
          inBlockquote = true;
          blockquoteBuffer.push(line.replace(/^>\s?/, ''));
          continue;
        } else if (inBlockquote) {
          flushBlockquote();
        }

        // Headings (#, ##, ###, ####, #####)
        const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (hMatch) {
          flushList();
          const level = hMatch[1].length;
          const text = this._renderInline(hMatch[2].trim());
          out.push(`<h${level} class="md-heading md-h${level}">${text}</h${level}>`);
          continue;
        }

        // Horizontal Rule (--- or *** or ___)
        if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
          flushList();
          out.push('<hr class="md-hr" />');
          continue;
        }

        // Unordered lists (* or -)
        const ulMatch = line.match(/^(\s*)[*-]\s+(.+)$/);
        if (ulMatch) {
          if (!inList || listType !== 'ul') {
            flushList();
            out.push('<ul class="md-list md-ul">');
            inList = true;
            listType = 'ul';
          }
          out.push(`<li>${this._renderInline(ulMatch[2])}</li>`);
          continue;
        }

        // Ordered lists (1. or 2.)
        const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
        if (olMatch) {
          if (!inList || listType !== 'ol') {
            flushList();
            out.push('<ol class="md-list md-ol">');
            inList = true;
            listType = 'ol';
          }
          out.push(`<li>${this._renderInline(olMatch[2])}</li>`);
          continue;
        }

        // Empty line
        if (!line.trim()) {
          flushList();
          continue;
        }

        // Regular paragraph
        flushList();
        out.push(`<p class="md-p">${this._renderInline(line)}</p>`);
      }

      flushList();
      flushBlockquote();

      let resultHtml = out.join('\n');

      // Re-insert code blocks
      resultHtml = resultHtml.replace(/%%CODE_BLOCK_(\d+)%%/g, (match, idx) => {
        const item = codeBlocks[Number(idx)];
        if (!item) return '';
        const escapedCode = escapeHTML(item.code);
        return `
          <div class="md-code-block-wrapper">
            <div class="md-code-header">
              <span class="md-code-lang">${escapeHTML(item.lang)}</span>
              <button type="button" class="md-copy-btn" onclick="navigator.clipboard.writeText(this.closest('.md-code-block-wrapper').querySelector('code').innerText).then(() => { this.innerText = 'Copied!'; setTimeout(() => this.innerText = 'Copy', 1500); })">Copy</button>
            </div>
            <pre class="md-pre"><code class="md-code">${escapedCode}</code></pre>
          </div>
        `;
      });

      // Re-insert tables
      resultHtml = resultHtml.replace(/%%TABLE_BLOCK_(\d+)%%/g, (match, idx) => {
        return tableBlocks[Number(idx)] || '';
      });

      // Re-insert math blocks
      resultHtml = resultHtml.replace(/%%MATH_BLOCK_(\d+)%%/g, (match, idx) => {
        const math = mathBlocks[Number(idx)];
        return `<div class="md-math-block"><code>${escapeHTML(math)}</code></div>`;
      });

      return resultHtml;
    },

    _renderInline(text) {
      if (!text) return '';

      // Escape raw HTML first so untrusted markdown cannot inject tags/handlers.
      // Formatting below only wraps already-escaped text in fixed safe tags.
      let out = escapeHTML(text);

      // Inline code (content already escaped)
      out = out.replace(/`([^`]+)`/g, (match, code) => {
        return `<code class="md-inline-code">${code}</code>`;
      });

      // KaTeX / Inline math $...$
      out = out.replace(/\$([^\$]+)\$/g, (match, math) => {
        return `<span class="md-inline-math">${math}</span>`;
      });

      // Bold & Italic
      out = out.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
      out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
      out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      out = out.replace(/_([^_]+)_/g, '<em>$1</em>');

      // Strikethrough
      out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');

      // Markdown links: [title](url) - reject non-http(s)/relative schemes
      out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, title, url) => {
        const rawUrl = String(url || '').trim();
        const decodedGuess = rawUrl
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"');
        if (/^\s*(javascript:|data:|vbscript:)/i.test(decodedGuess)) {
          return title;
        }
        const cleanUrl = escapeHTML(decodedGuess);
        const isExternal = /^https?:\/\//i.test(decodedGuess);
        return `<a href="${cleanUrl}" ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''} class="md-link">${title}</a>`;
      });

      return out;
    },

    _renderBlockquote(rawText) {
      const trimmed = rawText.trim();

      // Check for GitHub style alert: [!NOTE], [!TIP], [!IMPORTANT], [!WARNING], [!CAUTION]
      const alertMatch = trimmed.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n?([\s\S]*)$/i);
      if (alertMatch) {
        const type = alertMatch[1].toUpperCase();
        const content = this.render(alertMatch[2].trim());
        const titles = {
          NOTE: 'Note',
          TIP: 'Tip',
          IMPORTANT: 'Important',
          WARNING: 'Warning',
          CAUTION: 'Caution'
        };
        return `
          <div class="md-alert md-alert-${type.toLowerCase()}">
            <div class="md-alert-title">${titles[type] || type}</div>
            <div class="md-alert-body">${content}</div>
          </div>
        `;
      }

      return `<blockquote class="md-blockquote">${this.render(trimmed)}</blockquote>`;
    },

    _renderTables(text) {
      const tableBlocks = [];
      const lines = text.split('\n');
      const newLines = [];
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];
        // Check if line looks like a markdown table row (contains | and isn't a code fence)
        if (line.includes('|') && i + 1 < lines.length && /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(lines[i + 1])) {
          // Found table start!
          const headerLine = line;
          const alignLine = lines[i + 1];
          i += 2;

          const bodyLines = [];
          while (i < lines.length && lines[i].includes('|') && lines[i].trim().length > 0) {
            bodyLines.push(lines[i]);
            i++;
          }

          // Parse alignments
          const aligns = alignLine.split('|').map(s => s.trim()).filter(Boolean).map(s => {
            if (s.startsWith(':') && s.endsWith(':')) return 'center';
            if (s.endsWith(':')) return 'right';
            return 'left';
          });

          // Parse headers
          const headers = headerLine.split('|').map(s => s.trim()).filter(Boolean);

          let tableHtml = '<div class="md-table-wrapper"><table class="md-table"><thead><tr>';
          headers.forEach((h, idx) => {
            const align = aligns[idx] || 'left';
            tableHtml += `<th style="text-align: ${align};">${this._renderInline(h)}</th>`;
          });
          tableHtml += '</tr></thead><tbody>';

          bodyLines.forEach(row => {
            const cells = row.split('|').map(s => s.trim()).filter(Boolean);
            tableHtml += '<tr>';
            cells.forEach((c, idx) => {
              const align = aligns[idx] || 'left';
              tableHtml += `<td style="text-align: ${align};">${this._renderInline(c)}</td>`;
            });
            tableHtml += '</tr>';
          });

          tableHtml += '</tbody></table></div>';

          const placeholder = `%%TABLE_BLOCK_${tableBlocks.length}%%`;
          tableBlocks.push(tableHtml);
          newLines.push(placeholder);
        } else {
          newLines.push(line);
          i++;
        }
      }

      return {
        text: newLines.join('\n'),
        tableBlocks
      };
    }
  };

  APlus.markdown = MarkdownRenderer;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkdownRenderer;
  }

})(typeof window !== 'undefined' ? window : this);
