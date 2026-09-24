import researchService from '../services/researchService.js';

function requireUser(req, res) {
  if (!req.user?.id) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
      error: 'Authentication required.',
    });
    return false;
  }
  return true;
}

export const researchController = {
  async getFindings(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getFindings(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getGaps(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getGaps(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getDirections(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getDirections(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getBrain(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getBrain(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getContradictions(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getContradictions(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getTimeline(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getTimeline(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getCombinations(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getCombinations(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getOpportunities(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getOpportunities(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getExperiments(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getExperiments(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getLineage(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getLineage(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getFrontier(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getFrontier(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getImpact(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const months = Number(req.query?.months) || 6;
      const data = await researchService.getImpact(req.user.id, months);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async discover(req, res, next) {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ success: false, message: 'Query is required' });
      }

      if (!process.env.OPENALEX_API_KEY) {
        console.error('[Research Discovery] OPENALEX_API_KEY is missing from environment variables.');
        return res.status(500).json({ success: false, message: 'Server configuration error: OPENALEX_API_KEY is missing.' });
      }

      const openAlexUrl = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=10`;
      
      let response;
      let attempt = 0;
      const maxAttempts = 2;
      
      while (attempt < maxAttempts) {
        attempt++;
        response = await fetch(openAlexUrl, {
          headers: {
            'User-Agent': 'NEXUS-Research-Bot/1.0 (mailto:nexus-bot@example.com)', // Polite pool
            'Authorization': `Bearer ${process.env.OPENALEX_API_KEY}`
          }
        });
        
        if (response.status === 429 && attempt < maxAttempts) {
          console.warn(`[Research Discovery] OpenAlex returned 429. Retrying... (Attempt ${attempt}/${maxAttempts})`);
          const retryAfter = parseInt(response.headers.get('retry-after') || '2', 10);
          // Wait at most 5 seconds to avoid hanging the request too long
          const delay = Math.min(retryAfter * 1000, 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        break;
      }
      
      if (!response.ok) {
        let errorText = 'Unknown Error';
        try { errorText = await response.text(); } catch(e) {}
        
        console.error(`[Research Discovery] OpenAlex API Request Failed:
          - Endpoint: /works (OpenAlex)
          - HTTP Method: GET
          - Status: ${response.status}
          - Error: ${errorText.substring(0, 500)}`);
          
        if (response.status === 429) {
          return res.status(429).json({ 
            success: false, 
            message: 'Research database is currently experiencing high traffic (Rate Limit). Please try again in a moment.' 
          });
        }
        return res.status(502).json({ 
          success: false, 
          message: 'Upstream research database returned an error. Please try again later.' 
        });
      }

      const data = await response.json();
      
      const results = (data.results || []).map(paper => {
        // Reconstruct abstract from inverted index
        let abstract = null;
        if (paper.abstract_inverted_index) {
          const positions = [];
          for (const [word, indices] of Object.entries(paper.abstract_inverted_index)) {
            for (const idx of indices) {
              positions[idx] = word;
            }
          }
          abstract = positions.filter(Boolean).join(' ');
        }

        return {
          title: paper.title,
          authors: (paper.authorships || []).map(a => a.author && a.author.display_name).filter(Boolean),
          year: paper.publication_year,
          abstract: abstract,
          url: paper.doi || paper.id, // Prefer DOI, fallback to OpenAlex ID
          pdfUrl: paper.open_access?.is_oa && paper.open_access?.oa_url ? paper.open_access.oa_url : null,
          doi: paper.doi,
          source: paper.primary_location?.source?.display_name || 'OpenAlex'
        };
      });

      res.json({ query, results });
    } catch (err) {
      console.error('[Research Discovery] Internal error during request processing:', err.message);
      res.status(500).json({ success: false, message: 'Research discovery encountered an internal server error.' });
    }
  }
};

export default researchController;
