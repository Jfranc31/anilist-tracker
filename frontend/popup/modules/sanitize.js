// Sanitize HTML that comes from AniList (descriptions) before it is rendered.
// Only simple formatting tags are kept; everything else is dropped or unwrapped.

const ALLOWED_TAGS = new Set(['BR', 'P', 'I', 'B', 'EM', 'STRONG', 'U', 'S', 'SPAN', 'A']);
// Removed together with their contents
const DROPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT']);

function cleanNode(node) {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === Node.TEXT_NODE) continue;

    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove(); // comments etc.
      continue;
    }

    if (DROPPED_TAGS.has(child.tagName)) {
      child.remove();
      continue;
    }

    cleanNode(child);

    if (!ALLOWED_TAGS.has(child.tagName)) {
      // Unknown tag: keep its (already cleaned) contents, drop the tag itself
      child.replaceWith(...child.childNodes);
      continue;
    }

    const href = child.tagName === 'A' ? child.getAttribute('href') : null;
    for (const attr of [...child.attributes]) child.removeAttribute(attr.name);

    if (child.tagName === 'A') {
      if (href && /^https?:\/\//i.test(href)) {
        child.setAttribute('href', href);
        child.setAttribute('target', '_blank');
        child.setAttribute('rel', 'noopener noreferrer');
      } else {
        child.replaceWith(...child.childNodes);
      }
    }
  }
}

/**
 * Return a DocumentFragment containing a safe copy of `html`.
 */
export function sanitizeHTML(html) {
  const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');
  cleanNode(doc.body);
  const fragment = document.createDocumentFragment();
  fragment.append(...doc.body.childNodes);
  return fragment;
}
