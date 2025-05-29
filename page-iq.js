(function () {
  const font = 'Poppins, sans-serif';

  function createStyledEl(tag, cssText, html) {
    const el = document.createElement(tag);
    el.style.cssText = cssText;
    if (html) el.innerHTML = html;
    return el;
  }

  function root(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '').split('.').slice(-2).join('.');
    } catch {
      return '';
    }
  }

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  const panel = createStyledEl('div', `
    position: fixed; top: 20px; left: 20px;
    background: #fff; color: #000; font-size: 13px;
    border: 1px solid #ccc; border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 999999; min-width: 420px; max-width: 90vw;
    font-family: ${font}; line-height: 1.5;
  `);

  const header = createStyledEl('div', `
    background: #000; color: #fff; padding: 10px;
    cursor: move; font-weight: bold; user-select: none;
    display: flex; justify-content: space-between; align-items: center;
  `);

  const titleSpan = createStyledEl('span', 'font-size: 14px;', 'RankBrain: PageIQ');

  const controls = createStyledEl('div', 'display: flex; gap: 10px; align-items: center; margin-left: auto;');

  function createToggle(labelText, defaultState) {
    const label = createStyledEl('label', `
      font-size: 12px; color: #fff; cursor: pointer;
      display: flex; align-items: center; gap: 4px;
    `);
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = defaultState;
    input.style.cursor = 'pointer';
    label.appendChild(document.createTextNode(labelText));
    label.insertBefore(input, label.firstChild);
    return { label, input };
  }

  const highlight = createToggle('Highlight', true);
  controls.appendChild(highlight.label);

  const sidebar = createToggle('Sidebar', false);
  controls.appendChild(sidebar.label);

  const closeBtn = createStyledEl('span', 'cursor: pointer;', '✕');
  closeBtn.onclick = e => { e.stopPropagation(); panel.remove(); };
  controls.appendChild(closeBtn);

  header.appendChild(titleSpan);
  header.appendChild(controls);
  panel.appendChild(header);

  const content = createStyledEl('div', 'padding: 10px;');

  // Section: Robots, Meta & Canonical
  const robotsMeta = [...document.querySelectorAll('meta[name="robots"], meta[name="googlebot"]')];
  let robotsHtml = '<h3 style="font-size:14px;margin-bottom:6px;">Robots, Meta & Canonical</h3>';

  robotsMeta.forEach(meta => {
    const name = meta.getAttribute('name');
    const val = meta.getAttribute('content');
    robotsHtml += `<p><strong>${name}:</strong> ${escapeHTML(val)}</p>`;
  });

  const canonical = document.querySelector('link[rel="canonical"]');
  const metaTitle = `<p><strong>Title:</strong> ${escapeHTML(document.title)}</p>`;
  const metaCanonical = canonical
    ? `<p><strong>Canonical:</strong> <a href="${canonical.href}" target="_blank">${canonical.href}</a></p>`
    : '<p>No canonical tag found.</p>';

  robotsHtml += metaCanonical + metaTitle;
  robotsHtml += `<div id="robots-check-status" style="margin-top:6px;">Checking robots.txt…</div>`;
  robotsHtml += `<button id="open-robots" style="margin-top:6px;padding:4px 8px;font-size:12px;cursor:pointer;">Open robots.txt</button>`;

  const robotsSection = createStyledEl('div', '', robotsHtml);
  content.appendChild(robotsSection);

  document.body.appendChild(panel);

  fetch(location.origin + '/robots.txt')
    .then(res => res.ok ? res.text() : '')
    .then(text => {
      const lines = text.split('\n').map(l => l.trim());
      let disallows = [], isMatch = false, userAgentBlock = false, currentAgent = null;

      lines.forEach(line => {
        if (line.toLowerCase().startsWith('user-agent:')) {
          currentAgent = line.split(':')[1].trim().toLowerCase();
          userAgentBlock = ['*', 'googlebot'].includes(currentAgent);
        }
        if (userAgentBlock && line.toLowerCase().startsWith('disallow:')) {
          const path = line.split(':')[1].trim();
          if (path) disallows.push(path);
        }
      });

      const currentPath = location.pathname;
      const blocked = disallows.some(rule => currentPath.startsWith(rule));
      const msg = blocked
        ? `<span style="color:#d00;">❌ This page is disallowed by robots.txt</span>`
        : `<span style="color:#080;">✅ This page is crawlable by robots.txt</span>`;
      document.getElementById('robots-check-status').innerHTML = msg;
    })
    .catch(() => {
      document.getElementById('robots-check-status').innerHTML = '⚠️ Could not fetch robots.txt';
    });

  document.getElementById('open-robots').onclick = () => {
    window.open(location.origin + '/robots.txt', '_blank');
  };

  function addAccordion(title, html, open = false) {
    const section = document.createElement('div');
    const heading = createStyledEl('div', `
      background: #eee; padding: 8px 10px; font-weight: bold;
      cursor: pointer; border-top: 1px solid #ccc; font-size: 14px;
    `, title);

    const body = createStyledEl('div', `
      padding: 8px 10px; font-size: 13px; display: ${open ? 'block' : 'none'};
    `, html);

    heading.onclick = () => {
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
    };

    section.appendChild(heading);
    section.appendChild(body);
    content.appendChild(section);
  }

  const allLinks = [...document.querySelectorAll('a[href^="http"]')];
  const headerLinks = document.querySelectorAll('header a, footer a');
  const headerFooterSet = new Set([...headerLinks].map(a => a.href));
  const currentRoot = root(location.href);
  const externalLinks = [];
  let internalCount = 0;
  const relCounts = { sponsored: 0, nofollow: 0, ugc: 0, follow: 0 };

  allLinks.forEach(link => {
    const href = link.href;
    const rel = (link.getAttribute('rel') || '').toLowerCase();
    const linkRoot = root(href);
    if (!headerFooterSet.has(href) && linkRoot !== currentRoot)
      externalLinks.push([link.textContent.trim() || '[no text]', href]);
    if (linkRoot === currentRoot) internalCount++;
    if (rel.includes('sponsored')) relCounts.sponsored++;
    else if (rel.includes('nofollow')) relCounts.nofollow++;
    else if (rel.includes('ugc')) relCounts.ugc++;
    else relCounts.follow++;
  });

  const extHtml = externalLinks.length
    ? '<table style="border-collapse:collapse;width:100%;"><tr><th style="border:1px solid #ccc;padding:4px;">Anchor</th><th style="border:1px solid #ccc;padding:4px;">URL</th></tr>' +
      externalLinks.map(([t, h]) =>
        `<tr><td style="border:1px solid #ccc;padding:4px;">${escapeHTML(t)}</td><td style="border:1px solid #ccc;padding:4px;"><a href="${h}" target="_blank">${h}</a></td></tr>`
      ).join('') + '</table>' : '<p>No external links found (excluding header/footer).</p>';
  const intHtml = `<p>${internalCount} internal links to the same root domain.</p>`;
  const relHtml = `
    <ul style="padding-left: 20px; margin: 0; font-size:13px;">
      <li><strong>Sponsored:</strong> ${relCounts.sponsored}</li>
      <li><strong>Nofollow:</strong> ${relCounts.nofollow}</li>
      <li><strong>UGC:</strong> ${relCounts.ugc}</li>
      <li><strong>Follow / Normal:</strong> ${relCounts.follow}</li>
    </ul>`;

  addAccordion('External Links (Body Only)', extHtml);
  addAccordion('Internal Link Count', intHtml);
  addAccordion('Link Counts by rel Type', relHtml);

  panel.appendChild(content);

  function updateHighlights(on) {
    allLinks.forEach(link => {
      const rel = (link.getAttribute('rel') || '').toLowerCase();
      link.style.backgroundColor = '';
      link.title = '';
      if (!on) return;
      if (rel.includes('sponsored')) {
        link.style.backgroundColor = '#ff9999';
        link.title = 'rel="sponsored" (Paid link)';
      } else if (rel.includes('nofollow')) {
        link.style.backgroundColor = '#d1b3ff';
        link.title = 'rel="nofollow" (Ranking hint only)';
      } else if (rel.includes('ugc')) {
        link.style.backgroundColor = '#ffff99';
        link.title = 'rel="ugc" (User Generated Content)';
      } else {
        link.style.backgroundColor = '#ccffcc';
        link.title = 'rel="follow" or no rel (Normal link)';
      }
    });
  }

  highlight.input.addEventListener('change', () => updateHighlights(highlight.input.checked));
  updateHighlights(true);

  let isSidebar = false;
  sidebar.input.addEventListener('change', () => {
    isSidebar = sidebar.input.checked;
    if (isSidebar) {
      panel.style.top = '0px';
      panel.style.left = 'unset';
      panel.style.right = '0px';
      panel.style.height = '100vh';
      panel.style.width = '360px';
      panel.style.borderRadius = '0px';
    } else {
      panel.style.top = '20px';
      panel.style.left = '20px';
      panel.style.right = '';
      panel.style.height = '';
      panel.style.width = '';
      panel.style.borderRadius = '6px';
    }
  });

  let isDragging = false, offsetX = 0, offsetY = 0;
  header.addEventListener('mousedown', function (e) {
    if (isSidebar) return;
    isDragging = true;
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', function (e) {
    if (isDragging) {
      panel.style.left = `${e.clientX - offsetX}px`;
      panel.style.top = `${e.clientY - offsetY}px`;
    }
  });
  document.addEventListener('mouseup', function () {
    isDragging = false;
    document.body.style.userSelect = '';
  });
})();
