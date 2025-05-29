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
    background: #fff; color: #000; font-family: Arial, sans-serif;
    font-size: 13px; line-height: 1.5;
    border: 1px solid #ccc; border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 999999; min-width: 400px; max-width: 90vw;
  `;

  const style = document.createElement('style');
  style.textContent = `
    #pageiq-panel * {
      color: #000 !important;
    }
    #pageiq-panel a {
      color: #00f !important;
    }
  `;
  document.head.appendChild(style);

  const header = document.createElement('div');
  header.style.cssText = `
    background: #333; color: #fff; padding: 10px;
    cursor: move; font-weight: bold; user-select: none;
    display: flex; justify-content: space-between; align-items: center;
  `;
  const titleSpan = document.createElement('span');
  titleSpan.textContent = 'RankBrain: PageIQ';

  const controls = document.createElement('div');
  controls.style.cssText = 'display: flex; gap: 10px; align-items: center; margin-left: auto;';

  const highlightToggle = document.createElement('input');
  highlightToggle.type = 'checkbox';
  highlightToggle.checked = true;
  highlightToggle.title = 'Toggle link highlighting';
  highlightToggle.style.cursor = 'pointer';

  const highlightLabel = document.createElement('label');
  highlightLabel.textContent = 'Highlight';
  highlightLabel.style.cssText = 'font-size: 12px; color: #fff; cursor: pointer;';
  highlightLabel.appendChild(highlightToggle);
  controls.appendChild(highlightLabel);

  const sidebarToggle = document.createElement('input');
  sidebarToggle.type = 'checkbox';
  sidebarToggle.title = 'Toggle sidebar mode';
  sidebarToggle.style.cursor = 'pointer';

  const sidebarLabel = document.createElement('label');
  sidebarLabel.textContent = 'Sidebar';
  sidebarLabel.style.cssText = 'font-size: 12px; color: #fff; cursor: pointer;';
  sidebarLabel.appendChild(sidebarToggle);
  controls.appendChild(sidebarLabel);

  const closeBtn = document.createElement('span');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'cursor: pointer;';
  closeBtn.onclick = e => { e.stopPropagation(); panel.remove(); };
  controls.appendChild(closeBtn);

  header.appendChild(titleSpan);
  header.appendChild(controls);
  panel.appendChild(header);

  const content = document.createElement('div');
  content.style.padding = '10px';

  // Robots, Meta & Canonical (without heading)
  const metaTags = document.querySelectorAll('meta[name="robots"], meta[name="googlebot"]');
  const canonical = document.querySelector('link[rel="canonical"]');
  const pageTitle = document.title || '';
  let robotsHtml = '';

  metaTags.forEach(meta => {
    const name = meta.getAttribute('name');
    const val = meta.getAttribute('content');
    robotsHtml += `<p><strong>${name}:</strong> ${val}</p>`;
  });

  if (canonical && canonical.href !== window.location.href) {
    robotsHtml += `<p><strong>Canonical:</strong> <a href="${canonical.href}" target="_blank">${canonical.href}</a></p>`;
  } else if (canonical) {
    robotsHtml += `<p><strong>Canonical:</strong> Self-referencing canonical URL</p>`;
  } else {
    robotsHtml += '<p>No canonical tag found.</p>';
  }

  robotsHtml += `<div id="robots-check-status">Checking robots.txt…</div>`;

  const robotsSection = document.createElement('div');
  robotsSection.style.color = '#000';
  robotsSection.innerHTML = robotsHtml;
  content.appendChild(robotsSection);
  content.appendChild(document.createElement('br'));

  // Fetch robots.txt
  fetch(location.origin + '/robots.txt')
    .then(res => res.ok ? res.text() : '')
    .then(text => {
      const lines = text.split('\n').map(l => l.trim());
      let disallows = [], userAgentActive = false;
      for (let line of lines) {
        if (line.toLowerCase().startsWith('user-agent:')) {
          userAgentActive = line.includes('*') || line.toLowerCase().includes('googlebot');
        } else if (userAgentActive && line.toLowerCase().startsWith('disallow:')) {
          disallows.push(line.split(':')[1].trim());
        }
      }
      const blocked = disallows.some(path => location.pathname.startsWith(path));
      const msg = blocked
        ? `<span style="color:#d00;">❌ This page is disallowed by robots.txt</span>`
        : `<span style="color:#080;">✅ This page is crawlable by robots.txt</span>`;
      document.getElementById('robots-check-status').innerHTML = msg;
    })
    .catch(() => {
      document.getElementById('robots-check-status').textContent = '⚠️ Could not fetch robots.txt';
    });

  function addAccordionSection(title, html, open = false) {
    const section = document.createElement('div');
    const heading = document.createElement('div');
    heading.textContent = title;
    heading.style.cssText = `
      background: #eee; padding: 8px 10px; font-weight: bold;
      cursor: pointer; border-top: 1px solid #ccc; font-size: 14px;
    `;
    const body = document.createElement('div');
    body.style.cssText = 'padding: 8px 10px; display: ' + (open ? 'block' : 'none');
    body.innerHTML = html;
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

    if (!headerFooterSet.has(href) && linkRoot !== currentRoot) {
      externalLinks.push([link.textContent.trim() || '[no text]', href]);
    }

    if (linkRoot === currentRoot) internalCount++;

    if (rel.includes('sponsored')) relCounts.sponsored++;
    else if (rel.includes('nofollow')) relCounts.nofollow++;
    else if (rel.includes('ugc')) relCounts.ugc++;
    else relCounts.follow++;
  });

  const externalHtml = externalLinks.length
    ? '<table style="border-collapse:collapse;width:100%;font-size:14px;">' +
      '<tr><th style="border:1px solid #ccc;padding:4px;">Anchor</th><th style="border:1px solid #ccc;padding:4px;">URL</th></tr>' +
      externalLinks.map(([t, h]) =>
        `<tr><td style="border:1px solid #ccc;padding:4px;">${t}</td><td style="border:1px solid #ccc;padding:4px;"><a href="${h}" target="_blank">${h}</a></td></tr>`
      ).join('') + '</table>'
    : '<p>No external links found (excluding header/footer).</p>';

  const internalHtml = `<p>${internalCount} internal links to the same root domain.</p>`;
  const relHtml = `
    <ul style="padding-left: 20px; margin: 0; font-size:14px;">
      <li><strong>Sponsored:</strong> ${relCounts.sponsored}</li>
      <li><strong>Nofollow:</strong> ${relCounts.nofollow}</li>
      <li><strong>UGC:</strong> ${relCounts.ugc}</li>
      <li><strong>Follow / Normal:</strong> ${relCounts.follow}</li>
    </ul>`;

  addAccordionSection('External Links (Body Only)', externalHtml);
  addAccordionSection('Internal Link Count', internalHtml);
  addAccordionSection('Link Counts by rel Type', relHtml);

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

  let isSidebar = false;
  sidebarToggle.addEventListener('change', () => {
    isSidebar = sidebarToggle.checked;
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

  panel.appendChild(content);
  document.body.appendChild(panel);

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
