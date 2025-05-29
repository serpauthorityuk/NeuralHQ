(function () {
  const font = 'Poppins, sans-serif';

  function escapeHTML(str) {
    return str.replace(/[&<>"]+/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
    }[tag]));
  }

  function root(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '').split('.').slice(-2).join('.');
    } catch {
      return '';
    }
  }

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

  const sectionMeta = document.createElement('div');
  sectionMeta.innerHTML = '<h3 style="font-size:14px;">Robots, Meta & Canonical</h3>';

  const metaTags = document.querySelectorAll('meta[name="robots"], meta[name="googlebot"]');
  const canonical = document.querySelector('link[rel="canonical"]');
  const title = document.title;

  metaTags.forEach(tag => {
    const p = document.createElement('p');
    p.innerHTML = `<strong>${tag.getAttribute('name')}:</strong> ${escapeHTML(tag.getAttribute('content'))}`;
    sectionMeta.appendChild(p);
  });

  const canonP = document.createElement('p');
  canonP.innerHTML = `<strong>Canonical:</strong> ${
    canonical ? `<a href="${canonical.href}" target="_blank">${canonical.href}</a>` : 'Not set'
  }`;
  sectionMeta.appendChild(canonP);

  const titleP = document.createElement('p');
  titleP.innerHTML = `<strong>Title:</strong> ${escapeHTML(title)}`;
  sectionMeta.appendChild(titleP);

  const robotsStatus = document.createElement('div');
  robotsStatus.textContent = 'Checking robots.txt…';
  sectionMeta.appendChild(robotsStatus);

  const robotsBtn = document.createElement('button');
  robotsBtn.textContent = 'Open robots.txt';
  robotsBtn.style.cssText = 'margin-top:6px;padding:4px 8px;font-size:12px;cursor:pointer;';
  robotsBtn.onclick = () => window.open(location.origin + '/robots.txt', '_blank');
  sectionMeta.appendChild(robotsBtn);

  content.appendChild(sectionMeta);

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
      robotsStatus.innerHTML = isBlocked
        ? '<span style="color:#d00;">❌ This page is disallowed by robots.txt</span>'
        : '<span style="color:#080;">✅ This page is crawlable by robots.txt</span>';
    });

  document.body.appendChild(panel);
})();
