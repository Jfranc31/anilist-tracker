// Detail view: related entries and recommendations
import { getPreferredTitle } from '../state.js';

// openMedia(media, type) opens another title in the detail view (see openRelatedMedia).

export function renderRelations(anime, detailRelations, openMedia) {
    detailRelations.innerHTML = '';
    const relations = anime.relations?.edges || [];

    const relevantTypes = ['PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY', 'SPIN_OFF', 'ALTERNATIVE', 'ADAPTATION', 'SOURCE', 'OTHER', 'COMPILATION', 'CONTAINS', 'SUMMARY'];
    const typeLabels = {
      PREQUEL: 'Prequel',
      SEQUEL: 'Sequel',
      PARENT: 'Parent Story',
      SIDE_STORY: 'Side Story',
      SPIN_OFF: 'Spin-off',
      ALTERNATIVE: 'Alternative',
      ADAPTATION: 'Adaptation',
      SOURCE: 'Source',
      OTHER: 'Other',
      COMPILATION: 'Compilation',
      CONTAINS: 'Contains',
      SUMMARY: 'Summary'
    };

    const filtered = relations.filter(e => relevantTypes.includes(e.relationType));

    if (filtered.length === 0) {
      detailRelations.innerHTML = '<p style="font-size:13px;color:#a0a0a0;">No related entries found.</p>';
    } else {
      const REL_INITIAL = 4;

      const buildRelCard = (edge) => {
        const node = edge.node;
        const relTitle = getPreferredTitle(node.title);
        const relCover = node.coverImage?.medium || '';
        const relType = typeLabels[edge.relationType] || edge.relationType;
        const relFormat = node.format ? node.format.replace(/_/g, ' ') : '';
        const listStatus = node.mediaListEntry?.status;

        const card = document.createElement('div');
        card.className = 'relation-card';
        card.innerHTML = `
          ${relCover ? `<img src="${relCover}" alt="${relTitle}" class="relation-cover">` : ''}
          <div class="relation-info">
            <div class="relation-type">${relType}</div>
            <div class="relation-title">${relTitle}</div>
            ${relFormat ? `<div class="relation-meta">${relFormat}</div>` : ''}
          </div>
          ${listStatus ? `<span class="relation-status-badge on-list">${listStatus.charAt(0) + listStatus.slice(1).toLowerCase()}</span>` : ''}
        `;

        card.addEventListener('click', () => {
          openMedia({
            id: node.id,
            title: node.title,
            coverImage: node.coverImage || { large: '', medium: '' },
            mediaListEntry: node.mediaListEntry || null,
            status: node.status,
            type: node.type
          }, node.type);
        });

        return card;
      };

      filtered.slice(0, REL_INITIAL).forEach(e => detailRelations.appendChild(buildRelCard(e)));

      if (filtered.length > REL_INITIAL) {
        const btn = document.createElement('button');
        btn.className = 'detail-show-more-btn';
        btn.textContent = `Show ${filtered.length - REL_INITIAL} more`;
        btn.addEventListener('click', () => {
          filtered.slice(REL_INITIAL).forEach(e => detailRelations.appendChild(buildRelCard(e)));
          btn.remove();
        });
        detailRelations.appendChild(btn);
      }
    }
}

export function renderRecommendations(anime, detailRecommendations, openMedia) {
    detailRecommendations.innerHTML = '';
    const recNodes = (anime.recommendations?.nodes || []).filter(n => n.mediaRecommendation);
    const REC_LIMIT = 6;
    if (recNodes.length > 0) {
      const list = document.createElement('div');
      list.className = 'relations-list';
      const buildRecCard = (rec) => {
        const media = rec.mediaRecommendation;
        const recTitle = getPreferredTitle(media.title);
        const recCover = media.coverImage?.large || media.coverImage?.medium || '';
        const card = document.createElement('div');
        card.className = 'relation-card';
        card.innerHTML = `
          ${recCover ? `<img src="${recCover}" alt="${recTitle}" class="relation-cover">` : ''}
          <div class="relation-info">
            <div class="relation-title">${recTitle}</div>
          </div>
        `;
        card.addEventListener('click', () => {
          openMedia({ id: media.id, title: media.title, coverImage: media.coverImage || { large: '', medium: '' }, mediaListEntry: null });
        });
        return card;
      };
      recNodes.slice(0, REC_LIMIT).forEach(r => list.appendChild(buildRecCard(r)));
      detailRecommendations.appendChild(list);
      if (recNodes.length > REC_LIMIT) {
        const btn = document.createElement('button');
        btn.className = 'detail-show-more-btn';
        btn.textContent = `Show ${recNodes.length - REC_LIMIT} more`;
        btn.addEventListener('click', () => {
          recNodes.slice(REC_LIMIT).forEach(r => list.appendChild(buildRecCard(r)));
          btn.remove();
        });
        detailRecommendations.appendChild(btn);
      }
    } else {
      detailRecommendations.innerHTML = '<p style="font-size:13px;color:#a0a0a0;">No recommendations found.</p>';
    }
}
