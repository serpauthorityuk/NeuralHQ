(function () {
  const font = 'Poppins, sans-serif';

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  function root(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '').split('.').slice(-2).join('.');
    } catch {
      return '';
    }
  }

  // Create Panel
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed; top: 20px; left: 20px; background: #fff; font-family: ${font};
    color: #000; font-size: 13px; line-height: 1.5; border: 1px solid #ccc;
    border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 999999; min-width: 420px; max-width: 90vw;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    background: #000; color: #fff; padding: 10px; font-size: 14px;
    font-weight: bold; user-select: none; display: flex; justify-content: space-between; align-items: center;
  `;
  header.innerHTML = `<span>RankBrain: PageIQ</span>`;

  const controls = document.createElement('div');
  controls.style.cssText = 'display: flex; gap: 10px; align-items: center; margin-left: auto;';

  function createToggle(labelText, defaultChecked) {
    const label = document.createElement('label');
    label.style.cssText = 'font-size: 12px; color: #fff; cursor: pointer;';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = defaultChecked;
    checkbox.style.marginRight = '4px';
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(labelText));
    return { label, checkbox };
  }

  const highlightToggle = createToggle('Highlight', true);
  const sidebarToggle = createToggle('Sidebar', false);
  controls.appendChild(highlightToggle.label);
  controls.appendChild(sidebarToggle.label);

  const closeBtn = document.createElement('span');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'cursor: pointer; margin-left: 10px;';
  closeBtn.onclick = e => { e.stopPropagation(); panel.remove(); };
  controls.appendChild(closeBtn);

  header.appendChild(controls);
  panel.appendChild(header);

  const content = document.createElement('div');
  content.style.padding = '10px';
  panel.appendChild(content);

  // Robots, Meta & Canonical Section
  const sectionMeta = document.createElement('div');
  const metaTags = document.querySelectorAll('meta[name="robots"], meta[name="googlebot"]');
  const canonical = document.querySelector('link[rel="canonical"]');
  const title = document.title;

  let metaHTML = '<h3 style="font-size:14px;">Robots, Meta & Canonical</h3>';
  metaTags.forEach(tag => {
    metaHTML += `<p><strong>${tag.getAttribute('name')}:</strong> ${escapeHTML(tag.getAttribute('content'))}</p>`;
  });
  metaHTML += `<p><strong>Canonical:</strong> ${canonical ? `<a href="${canonical.href}" target="_blank">${canonical.href}</a>` : 'Not set'}</p>`;
  metaHTML += `<p><strong>Title:</strong> ${escapeHTML(title)}</p>`;
  metaHTML += `<div id="robots-check-status">Checking robots.txt…</div>`;
  metaHTML += `<button id="open-robots-btn" style="margin-top:6px;padding:4px 8px;font-size:12px;cursor:pointer;">Open robots.txt</button>`;
  sectionMeta.innerHTML = metaHTML;
  content.appendChild(sectionMeta);

  // robots.txt check
  fetch(location.origin + '/robots.txt')
    .then(res => res.ok ? res.text() : '')
    .then(text => {
      const lines = text.split('\n').map(l => l.trim());
      let disallows = [], userAgentMatch = false;
      lines.forEach(line => {
        if (line.toLowerCase().startsWith('user-agent:')) {
          userAgentMatch = line.toLowerCase().includes('*') || line.toLowerCase().includes('googlebot');
        } else if (userAgentMatch && line.toLowerCase().startsWith('disallow:')) {
          const path = line.split(':')[1].trim();
          if (path) disallows.push(path);
        }
      });
      const isBlocked = disallows.some(rule => location.pathname.startsWith(rule));
      document.getElementById('robots-check-status').innerHTML =
        isBlocked
          ? '<span style="color:#d00;">❌ This page is disallowed by robots.txt</span>'
          : '<span style="color:#080;">✅ This page is crawlable by robots.txt</span>';
    });

  document.getElementById('open-robots-btn').onclick = () => {
    window.open(location.origin + '/robots.txt', '_blank');
  };

  // Accordion builder
  function addAccordion(titleText, htmlContent) {
    const section = document.createElement('div');
    const heading = document.createElement('div');
    heading.textContent = titleText;
    heading.style.cssText = `
      background: #eee; padding: 8px 10px; font-weight: bold;
      cursor: pointer; border-top: 1px solid #ccc; font-size: 14px;
    `;
    const body = document.createElement('div');
    body.style.cssText = 'padding: 8px 10px; display: none;';
    body.innerHTML = htmlContent;

    heading.onclick = () => {
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
    };

    section.appendChild(heading);
    section.appendChild(body);
    content.appendChild(section);
  }

  // Link auditing
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

    if (!headerFooterSet.has(href) && linkRoot !== currentRoot) {
      externalLinks.push([link.textContent.trim() || '[no text]', href]);
    }

    if (linkRoot === currentRoot) internalCount++;

    if (rel.includes('sponsored')) relCounts.sponsored++;
    else if (rel.includes('nofollow')) relCounts.nofollow++;
    else if (rel.includes('ugc')) relCounts.ugc++;
    else relCounts.follow++;
  });

  // External Links Section
  const extHTML = externalLinks.length
    ? '<table style="border-collapse:collapse;width:100%;"><tr><th style="border:1px solid #ccc;padding:4px;">Anchor</th><th style="border:1px solid #ccc;padding:4px;">URL</th></tr>' +
      externalLinks.map(([t, h]) =>
        `<tr><td style="border:1px solid #ccc;padding:4px;">${escapeHTML(t)}</td><td style="border:1px solid #ccc;padding:4px;"><a href="${h}" target="_blank">${h}</a></td></tr>`
      ).join('') + '</table>'
    : '<p>No external links found (excluding header/footer).</p>';
  addAccordion('External Links (Body Only)', extHTML);

  // Internal Link Count Section
  addAccordion('Internal Link Count', `<p>${internalCount} internal links to the same root domain.</p>`);

  // rel attribute counts
  const relHTML = `
    <ul style="padding-left: 20px; margin: 0;">
      <li><strong>Sponsored:</strong> ${relCounts.sponsored}</li>
      <li><strong>Nofollow:</strong> ${relCounts.nofollow}</li>
      <li><strong>UGC:</strong> ${relCounts.ugc}</li>
      <li><strong>Follow / Normal:</strong> ${relCounts.follow}</li>
    </ul>`;
  addAccordion('Link Counts by rel Type', relHTML);

  // Link highlighting
  function updateHighlights(active) {
    allLinks.forEach(link => {
      const rel = (link.getAttribute('rel') || '').toLowerCase();
      link.style.backgroundColor = '';
      link.title = '';
      if (!active) return;
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

  highlightToggle.checkbox.addEventListener('change', () => {
    updateHighlights(highlightToggle.checkbox.checked);
  });
  updateHighlights(true);

  // Sidebar toggle
  sidebarToggle.checkbox.addEventListener('change', () => {
    const active = sidebarToggle.checkbox.checked;
    if (active) {
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

  document.body.appendChild(panel);

  // Drag behavior
  let isDragging = false, offsetX = 0, offsetY = 0;
  header.addEventListener('mousedown', function (e) {
    if (sidebarToggle.checkbox.checked) return;
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
