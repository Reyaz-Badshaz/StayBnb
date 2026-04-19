export const normalizeImageUrl = (url, options = {}) => {
  if (!url) {
    return '';
  }

  if (!url.includes('unsplash.com')) {
    return url;
  }

  const { width = 1200, quality = 80 } = options;
  const [base, query] = url.split('?');
  const params = new URLSearchParams(query || '');
  params.set('w', String(width));
  params.set('q', String(quality));

  return `${base}?${params.toString()}`;
};
