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

      // Fetch from OpenAlex
      const response = await fetch(`https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=10`, {
        headers: {
          'User-Agent': 'NEXUS-Research-Bot/1.0 (mailto:nexus-bot@example.com)' // Polite pool
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAlex returned ${response.status}: ${errorText}`);
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
      console.error('[Research Discovery]', err);
      res.status(500).json({ success: false, message: `Research discovery failed: ${err.message}` });
    }
  }
};

export default researchController;
