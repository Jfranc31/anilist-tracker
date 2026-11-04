// Detail view: character list, 12 at a time, loading more pages from AniList as needed

export function renderCharacters(anime, detailCharacters) {
    detailCharacters.innerHTML = '';
    const CHAR_BATCH = 12;
    const roleLabels = { MAIN: 'Main', SUPPORTING: 'Supporting', BACKGROUND: 'Background' };

    const buildCharCard = (edge) => {
      const char = edge.node;
      const role = roleLabels[edge.role] || edge.role || '';
      const card = document.createElement('div');
      card.className = 'relation-card';
      if (char.siteUrl) {
        card.addEventListener('click', () => chrome.tabs.create({ url: char.siteUrl }));
        card.style.cursor = 'pointer';
      }
      card.innerHTML = `
        ${char.image?.medium ? `<img src="${char.image.medium}" alt="${char.name?.full || ''}" class="relation-cover">` : ''}
        <div class="relation-info">
          ${role ? `<div class="relation-type">${role}</div>` : ''}
          <div class="relation-title">${char.name?.full || ''}</div>
        </div>
      `;
      return card;
    };

    let charEdges = [...(anime.characters?.edges || [])];
    let hasNextPage = anime.characters?.pageInfo?.hasNextPage ?? false;
    let nextPage = 2;
    let shown = 0;

    const list = document.createElement('div');
    list.className = 'relations-list';
    detailCharacters.appendChild(list);

    const btn = document.createElement('button');
    btn.className = 'detail-show-more-btn';

    const updateBtn = () => {
      const buffered = charEdges.length - shown;
      if (buffered > 0 || hasNextPage) {
        const displayCount = Math.min(CHAR_BATCH, buffered > 0 ? buffered : CHAR_BATCH);
        const suffix = hasNextPage && buffered <= CHAR_BATCH ? '+' : '';
        btn.textContent = `Show ${displayCount}${suffix} more`;
        if (!btn.parentNode) detailCharacters.appendChild(btn);
      } else {
        btn.remove();
      }
    };

    const showBatch = () => {
      charEdges.slice(shown, shown + CHAR_BATCH).forEach(e => list.appendChild(buildCharCard(e)));
      shown = Math.min(shown + CHAR_BATCH, charEdges.length);
      updateBtn();
    };

    btn.addEventListener('click', async () => {
      if (charEdges.length > shown) {
        showBatch();
      } else if (hasNextPage) {
        btn.textContent = 'Loading...';
        btn.disabled = true;
        try {
          const result = await AniListAPI.getMediaCharacters(anime.id, nextPage);
          charEdges = charEdges.concat(result.edges || []);
          hasNextPage = result.pageInfo?.hasNextPage ?? false;
          nextPage++;
          btn.disabled = false;
          showBatch();
        } catch {
          btn.textContent = 'Failed to load — retry';
          btn.disabled = false;
        }
      }
    });

    if (charEdges.length > 0) {
      showBatch();
    } else {
      detailCharacters.innerHTML = '<p style="font-size:13px;color:#a0a0a0;">No characters found.</p>';
    }
}
