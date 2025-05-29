(function () {
  function root(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '').split('.').slice(-2).join('.');
    } catch {
      return '';
    }
  }

  const panel = document.createElement('div');
  panel.id = 'pageiq-panel';
  panel.style.cssText = `
    position: fixed; top: 20px; left: 20px;
    background: #fff; color: #000; font-size: 14px;
    border: 1px solid #ccc; border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 999999; min-width: 320px; max-width: 90vw;
    font-family: Arial, sans-serif;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    background: #333; color: #fff; padding: 10px;
    cursor: move; font-weight: bold; user-select: none;
    display: flex; justify-content: space-between; align-items: center;
  `;
  header.innerHTML = `<span>📋 PageIQ Overlay</span>`;

  const controls = document.createElement('div');
  controls.style.cssText = 'display: flex; gap: 10px; align-items: center;';

  const highlightToggle = document.createElement('input');
  highlightToggle.type = 'checkbox';
  highlightToggle.checked = true;
  highlightToggle.title = 'Toggle link highlighting';
  highlightToggle.style.cursor = 'pointer';

  const toggleLabel = document.createElement('label');
  toggleLabel.textContent = 'Highlight';
  toggleLabel.style.fontSize = '12px';
  toggleLabel.style.color = '#fff';
  toggleLabel.style.cursor = 'pointer';
  toggleLabel.appendChild(highlightToggle);
  controls.appendChild(toggleLabel);

  const sidebarToggle = document.createElement('button');
  sidebarToggle.textContent = '🧭 Sidebar';
  sidebarToggle.style.cssText = 'font-size: 12px; padding: 4px 8px; cursor: pointer;';
  controls.appendChild(sidebarToggle);

  const closeBtn = document.createElement('span');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'cursor: pointer;';
  closeBtn.onclick = e => { e.stopPropagation(); panel.remove(); };
  controls.appendChild(closeBtn);

  header.appendChild(controls);
  panel.appendChild(header);

  const content = document.createElement('div');
  content.style.padding = '10px';

  function addSection(title, html, isOpen = false) {
    const section = document.createElement('div');
    const heading = document.createElement('div');
    heading.textContent = title;
    heading.style.cssText = `
      background: #eee; padding: 8px 10px; font-weight: bold;
      cursor: pointer; border-top: 1px solid #ccc;
    `;

    const body = document.createElement('div');
    body.style.cssText = 'padding: 8px 10px;';
    body.innerHTML = html;
    body.style.display = isOpen ? 'block' : 'none';

    heading.onclick = () => {
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
    };

    section.appendChild(heading);
    section.appendChild(body);
    content.appendChild(section);
  }

  // Section 1: Robots meta and robots.txt
  const metaTags = document.querySelectorAll('meta[name="robots"], meta[name="googlebot"]');
  let metaInfo = '';
  metaTags.forEach(meta => {
    const name = meta.getAttribute('name');
    const content = meta.getAttribute('content');
    metaInfo += `<p><strong>${name}:</strong> ${content}</p>`;
  });
  metaInfo += `<p><a href="${location.origin}/robots.txt" target="_blank">View robots.txt</a></p>`;
  addSection('🤖 Robots Meta & robots.txt', metaInfo || '<p>No robots meta tags found.</p>', true);

  // Section 2: Canonical & meta description
  let canonicalInfo = '';
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonicalInfo += `<p><strong>Canonical:</strong> <a href="${canonical.href}" target="_blank">${canonical.href}</a></p>`;
  } else {
    canonicalInfo += '<p>No canonical tag found.</p>';
  }
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    canonicalInfo += `<p><strong>Description:</strong> ${metaDesc.content}</p>`;
  }
  addSection('🔖 Canonical & Meta Info', canonicalInfo);

  const currentRoot = root(location.href);
  const allLinks = [...document.querySelectorAll('a[href^="http"]')];
  const headerLinks = document.querySelectorAll('header a, footer a');
  const headerFooterSet = new Set([...headerLinks].map(a => a.href));

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

  // Section 3: External links
  const extHtml = externalLinks.length
    ? '<table style="border-collapse:collapse;width:100%;">' +
      '<tr><th style="border:1px solid #ccc;padding:4px;">Anchor</th><th style="border:1px solid #ccc;padding:4px;">URL</th></tr>' +
      externalLinks.map(([t, h]) =>
        `<tr><td style="border:1px solid #ccc;padding:4px;">${t}</td><td style="border:1px solid #ccc;padding:4px;"><a href="${h}" target="_blank">${h}</a></td></tr>`
      ).join('') + '</table>'
    : '<p>No external links found (excluding header/footer).</p>';
  addSection('🌍 External Links (Body Only)', extHtml);

  // Section 4: Internal count
  addSection('🏠 Internal Link Count', `<p>${internalCount} internal links to the same root domain.</p>`);

  // Section 5: Link counts by rel type
  const relHtml = `
    <ul style="padding-left: 20px; margin: 0;">
      <li><strong>Sponsored:</strong> ${relCounts.sponsored}</li>
      <li><strong>Nofollow:</strong> ${relCounts.nofollow}</li>
      <li><strong>UGC:</strong> ${relCounts.ugc}</li>
      <li><strong>Follow / Normal:</strong> ${relCounts.follow}</li>
    </ul>`;
  addSection('🔢 Link Counts by rel Type', relHtml);

  // Highlighting
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
  highlightToggle.addEventListener('change', () => updateHighlights(highlightToggle.checked));
  updateHighlights(true);

  // Sidebar toggle
  let isSidebar = false;
  sidebarToggle.onclick = function () {
    isSidebar = !isSidebar;
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
  };

  panel.appendChild(content);
  document.body.appendChild(panel);

  // Drag and drop
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
