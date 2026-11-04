// Detail view: stats chips, Info tab, description and external links
import { sanitizeHTML } from '../sanitize.js';

// Quick stats row: format, season, score and genres
export function renderStats(anime, detailInfoStats) {
    const seasonLabels = { WINTER: 'Winter', SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' };
    const chips = [];

    if (anime.format) chips.push({ label: anime.format.replace(/_/g, ' '), cls: 'stat-chip--format' });
    if (anime.season && anime.seasonYear) chips.push({ label: `${seasonLabels[anime.season] || anime.season} ${anime.seasonYear}`, cls: 'stat-chip--season' });
    if (anime.averageScore) chips.push({ label: `★ ${anime.averageScore}%`, cls: 'stat-chip--score' });

    const genres = (anime.genres || []).slice(0, 8);

    detailInfoStats.innerHTML =
      chips.map(c => `<span class="detail-stat-chip ${c.cls}">${c.label}</span>`).join('') +
      genres.map(g => `<span class="detail-stat-chip stat-chip--genre">${g}</span>`).join('');
}

// Info tab: dates, studios, producers, source, synonyms
export function renderInfo(anime, detailMetaBlock) {
    detailMetaBlock.innerHTML = '';

    const addSection = (title, buildFn) => {
      const section = document.createElement('div');
      section.className = 'detail-info-section';
      const h5 = document.createElement('h5');
      h5.textContent = title;
      section.appendChild(h5);
      buildFn(section);
      detailMetaBlock.appendChild(section);
    };

    const fmtDate = d => {
      if (!d?.year) return null;
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const m = d.month ? months[d.month - 1] : '';
      const day = d.day || '';
      if (m && day) return `${m} ${day}, ${d.year}`;
      if (m) return `${m} ${d.year}`;
      return String(d.year);
    };

    const makeStudioBtn = (studio) => {
      const btn = document.createElement('button');
      btn.className = 'detail-info-tag';
      btn.textContent = studio.name;
      if (studio.siteUrl) {
        btn.addEventListener('click', () => chrome.tabs.create({ url: studio.siteUrl }));
      } else {
        btn.classList.add('no-link');
      }
      return btn;
    };

    const startStr = fmtDate(anime.startDate);
    const endStr = fmtDate(anime.endDate);
    if (startStr || endStr) {
      addSection('Aired', section => {
        const row = document.createElement('div');
        row.className = 'detail-info-dates';
        if (startStr) {
          const item = document.createElement('div');
          item.className = 'date-item';
          item.innerHTML = `<span class="date-label">Start</span><span class="date-value">${startStr}</span>`;
          row.appendChild(item);
        }
        if (startStr && endStr) {
          const arrow = document.createElement('span');
          arrow.className = 'date-arrow';
          arrow.textContent = '→';
          row.appendChild(arrow);
        }
        if (endStr) {
          const item = document.createElement('div');
          item.className = 'date-item';
          item.innerHTML = `<span class="date-label">End</span><span class="date-value">${endStr}</span>`;
          row.appendChild(item);
        }
        section.appendChild(row);
      });
    }

    const studioNodes = anime.studios?.nodes || [];
    const animStudios = studioNodes.filter(s => s.isAnimationStudio);
    const producers = studioNodes.filter(s => !s.isAnimationStudio);

    if (animStudios.length > 0) {
      addSection('Studio', section => {
        const tags = document.createElement('div');
        tags.className = 'detail-info-tags';
        animStudios.forEach(s => tags.appendChild(makeStudioBtn(s)));
        section.appendChild(tags);
      });
    }

    if (producers.length > 0) {
      addSection('Producers', section => {
        const tags = document.createElement('div');
        tags.className = 'detail-info-tags';
        const PROD_LIMIT = 8;
        producers.slice(0, PROD_LIMIT).forEach(s => tags.appendChild(makeStudioBtn(s)));
        section.appendChild(tags);
        if (producers.length > PROD_LIMIT) {
          const more = document.createElement('button');
          more.className = 'detail-inline-more';
          more.textContent = `+${producers.length - PROD_LIMIT} more`;
          more.addEventListener('click', () => {
            producers.slice(PROD_LIMIT).forEach(s => tags.appendChild(makeStudioBtn(s)));
            more.remove();
          });
          section.appendChild(more);
        }
      });
    }

    if (anime.source) {
      addSection('Source', section => {
        const badge = document.createElement('span');
        badge.className = 'detail-info-source';
        badge.textContent = anime.source.replace(/_/g, ' ');
        section.appendChild(badge);
      });
    }

    const synonyms = (anime.synonyms || []).filter(s => s && s.trim());
    if (synonyms.length > 0) {
      addSection('Also Known As', section => {
        const tags = document.createElement('div');
        tags.className = 'detail-info-tags';
        const SYN_LIMIT = 6;
        synonyms.slice(0, SYN_LIMIT).forEach(syn => {
          const tag = document.createElement('span');
          tag.className = 'detail-info-tag no-link';
          tag.textContent = syn;
          tags.appendChild(tag);
        });
        section.appendChild(tags);
        if (synonyms.length > SYN_LIMIT) {
          const more = document.createElement('button');
          more.className = 'detail-inline-more';
          more.textContent = `+${synonyms.length - SYN_LIMIT} more`;
          more.addEventListener('click', () => {
            synonyms.slice(SYN_LIMIT).forEach(syn => {
              const tag = document.createElement('span');
              tag.className = 'detail-info-tag no-link';
              tag.textContent = syn;
              tags.appendChild(tag);
            });
            more.remove();
          });
          section.appendChild(more);
        }
      });
    }
}

// Description with show more/less toggle
export function renderDescription(anime, detailDescription) {
    const raw = anime.description || 'No description available.';
    detailDescription.innerHTML = '';

    const textEl = document.createElement('div');
    textEl.className = 'description-text collapsed';
    textEl.appendChild(sanitizeHTML(raw));
    detailDescription.appendChild(textEl);

    // Use plain-text length to decide — panel may be hidden so scrollHeight is 0
    const plainLength = textEl.textContent.trim().length;
    if (plainLength > 200) {
      const toggle = document.createElement('button');
      toggle.className = 'description-toggle';
      toggle.textContent = 'Show more';
      toggle.addEventListener('click', () => {
        const isCollapsed = textEl.classList.toggle('collapsed');
        toggle.textContent = isCollapsed ? 'Show more' : 'Show less';
      });
      detailDescription.appendChild(toggle);
    }
}

// External links, streaming sites first
export function renderExternalLinks(anime, detailExternalLinks) {
    detailExternalLinks.innerHTML = '';
    const allLinks = anime.externalLinks || [];
    const sorted = [...allLinks].sort((a, b) => (a.type === 'STREAMING' ? -1 : 1) - (b.type === 'STREAMING' ? -1 : 1));
    if (sorted.length > 0) {
      const h4 = document.createElement('h4');
      h4.textContent = 'External Links';
      detailExternalLinks.appendChild(h4);
      const grid = document.createElement('div');
      grid.className = 'external-links-grid';
      for (const link of sorted) {
        const btn = document.createElement('button');
        btn.className = 'external-link-btn';
        if (link.icon) {
          const img = document.createElement('img');
          img.src = link.icon;
          img.alt = link.site;
          img.className = 'ext-link-icon';
          btn.appendChild(img);
        }
        const nameEl = document.createElement('span');
        nameEl.className = 'ext-link-name';
        nameEl.textContent = link.site;
        btn.appendChild(nameEl);
        if (link.language) {
          const lang = document.createElement('span');
          lang.className = 'ext-link-lang';
          lang.textContent = link.language;
          btn.appendChild(lang);
        }
        btn.addEventListener('click', () => chrome.tabs.create({ url: link.url }));
        grid.appendChild(btn);
      }
      detailExternalLinks.appendChild(grid);
    }
}
