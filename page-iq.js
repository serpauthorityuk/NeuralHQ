(function () {
  function root(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '').split('.').slice(-2).join('.');
    } catch {
      return '';
    }
  }

  const links = document.querySelectorAll('a[href^="http"]');
  const externalLinks = [];
  let internalLinkCount = 0;
  const currentRoot = root(location.href);

  links.forEach(link => {
    const href = link.href;
    const linkRoot = root(href);
    if (linkRoot && linkRoot !== currentRoot) {
      externalLinks.push([link.textContent.trim() || '[no text]', href]);
    } else if (linkRoot === currentRoot) {
      internalLinkCount++;
    }
  });

  const panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    background: #fff;
    color: #000;
    font-size: 13px;
    padding: 0;
    border: 1px solid #ccc;
    border-radius: 6px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    z-index: 999999;
    max-width: 90vw;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    font-weight: bold;
    padding: 8px 10px;
    background: #333;
    color: #fff;
    cursor: pointer;
  `;
  header.textContent = '🔗 External Links & Internal Count';

  const close = document.createElement('span');
  close.textContent = ' ✕';
  close.style.cssText = 'float: right; cursor: pointer;';
  close.onclick = function (e) {
    e.stopPropagation();
    panel.remove();
  };
  header.appendChild(close);

  const content = document.createElement('div');
  content.style.padding = '10px';
  content.innerHTML = `
    <style>
      table.exttbl {
        border-collapse: collapse;
        width: 100%;
      }
      table.exttbl td,
      table.exttbl th {
        padding: 4px 6px;
        border: 1px solid #ccc;
        text-align: left;
      }
      table.exttbl tr:nth-child(even) {
        background: #f9f9f9;
      }
      table.exttbl a {
        color: #0066cc;
        text-decoration: none;
      }
    </style>
    <table class="exttbl">
      <tr><th>Anchor Text</th><th>External URL</th></tr>
      ${externalLinks.map(e => `
        <tr>
          <td>${e[0]}</td>
          <td><a href="${e[1]}" target="_blank" rel="noopener noreferrer">${e[1]}</a></td>
        </tr>`).join('')}
    </table>
    <br>
    <strong>Internal Links:</strong> ${internalLinkCount}
  `;

  header.onclick = function (e) {
    if (e.target !== close) {
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    }
  };

  panel.appendChild(header);
  panel.appendChild(content);
  document.body.appendChild(panel);
})();
