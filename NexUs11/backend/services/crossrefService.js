export const crossrefService = {
  async searchCrossref(query) {
    if (!query) return [];

    const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=8&mailto=nexus-bot@example.com`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NEXUS-Research-Bot/1.0 (mailto:nexus-bot@example.com)'
      }
    });

    if (!response.ok) {
      let errorText = 'Unknown Error';
      try { errorText = await response.text(); } catch(e) {}
      throw new Error(`Crossref API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const items = data?.message?.items || [];

    return items.map(item => {
      // Normalize authors
      const authors = (item.author || []).map(a => {
        if (a.given && a.family) return `${a.given} ${a.family}`;
        if (a.family) return a.family;
        return a.name || 'Unknown Author';
      }).filter(Boolean);

      // Normalize year
      let year = null;
      if (item.issued && item.issued['date-parts'] && item.issued['date-parts'][0] && item.issued['date-parts'][0][0]) {
        year = item.issued['date-parts'][0][0];
      } else if (item.created && item.created['date-parts'] && item.created['date-parts'][0] && item.created['date-parts'][0][0]) {
        year = item.created['date-parts'][0][0];
      }

      // Normalize abstract
      let abstract = "";
      if (item.abstract) {
        // Crossref often returns abstract inside <jats:p> tags or similar XML
        abstract = item.abstract.replace(/<[^>]*>?/gm, '').trim();
      }

      // Normalize DOI and URL
      const doi = item.DOI || null;
      const url = item.URL || (doi ? `https://doi.org/${doi}` : null);

      // Title
      const title = (item.title && item.title.length > 0) ? item.title[0] : 'Untitled Document';

      // Source / Publisher
      const source = item.publisher || item['container-title']?.[0] || 'Crossref';

      return {
        title,
        authors,
        year,
        abstract,
        url,
        doi,
        source
      };
    });
  }
};

export default crossrefService;
