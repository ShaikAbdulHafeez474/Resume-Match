const axios = require('axios');

const APIFY_BASE = 'https://api.apify.com/v2';

function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function runApifyActor(actorId, input) {
  const runRes = await axios.post(
    `${APIFY_BASE}/acts/${actorId}/runs?waitForFinish=180`,
    input,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.APIFY_API_TOKEN}`
      },
      timeout: 200000
    }
  );

  const datasetId = runRes.data?.data?.defaultDatasetId;
  if (!datasetId) throw new Error('No datasetId returned from Apify');

  await new Promise(r => setTimeout(r, 3000));

  const dataRes = await axios.get(
    `${APIFY_BASE}/datasets/${datasetId}/items?format=json&clean=true&limit=100`,
    {
      headers: { Authorization: `Bearer ${process.env.APIFY_API_TOKEN}` }
    }
  );

  return dataRes.data || [];
}

function normalizeApifyJob(job) {
  const source = job.site || job.site_name || job.source || job.platform || 'unknown';
  const applyUrl = job.job_url || job.job_url_direct || job.url || job.apply_link || '';
  const externalId = job.id || job.job_id || job.job_url ||
    `${source}_${(job.title || '').replace(/\s+/g, '_')}_${(job.company || '').replace(/\s+/g, '_')}`.slice(0, 120);

  return {
    external_id:    externalId,
    title:          job.title || job.job_title || '',
    company:        job.company || job.employer_name || job.company_name || '',
    location:       job.location || job.job_location || job.city || '',
    is_remote:      job.is_remote || job.job_is_remote || job.remote || false,
    job_type:       job.job_type || job.employment_type || '',
    description:    stripHtml(job.description || job.job_description || ''),
    apply_url:      applyUrl,
    source:         source,
    salary_display: job.salary_display || job.salary ||
      (job.min_amount && job.max_amount ? `${job.currency || '$'}${job.min_amount}-${job.max_amount}` : null),
    posted_at:      job.date_posted || job.posted_at || job.job_posted_at_datetime_utc || null,
  };
}

async function fetchRemotive(query) {
  try {
    const res = await axios.get('https://remotive.com/api/remote-jobs', {
      params: { search: query, limit: 20 },
      timeout: 15000,
    });
    return (res.data?.jobs || []).map(job => ({
      external_id:    `remotive_${job.id}`,
      title:          job.title || '',
      company:        job.company_name || '',
      location:       job.candidate_required_location || 'Remote',
      is_remote:      true,
      job_type:       job.job_type || '',
      description:    stripHtml(job.description || ''),
      apply_url:      job.url || '',
      source:         'remotive',
      salary_display: job.salary || null,
      posted_at:      job.publication_date || null,
    }));
  } catch (err) {
    console.error('Remotive fallback failed:', err.message);
    return [];
  }
}

async function scrapeJobs(queries) {
  const allJobs = [];

  for (const query of queries) {
    console.log(`\n🔍 Scraping for: "${query}"`);
    let jobsFromQuery = [];

    // Try primary Apify actor
    try {
      const raw = await runApifyActor('openclawai~job-board-scraper', {
        searchTerm:    query,
        location:      'India',
        siteName:      ['linkedin', 'indeed', 'glassdoor', 'google', 'zip_recruiter'],
        resultsWanted: 20,
        hoursOld:      72,
        country:       'IN'
      });

      console.log(`  Apify raw results: ${raw.length}`);

      if (raw.length > 0) {
        jobsFromQuery = raw.map(normalizeApifyJob).filter(j => j.external_id);
        console.log(`  Normalized: ${jobsFromQuery.length} jobs`);
      }
    } catch (err) {
      console.error(`  Apify failed for "${query}": ${err.message}`);
    }

    // Fallback to Remotive if Apify returned nothing
    if (jobsFromQuery.length === 0) {
      console.log(`  Falling back to Remotive for "${query}"`);
      jobsFromQuery = await fetchRemotive(query);
      console.log(`  Remotive returned: ${jobsFromQuery.length} jobs`);
    }

    allJobs.push(...jobsFromQuery);
    await new Promise(r => setTimeout(r, 800));
  }

  // Deduplicate by external_id
  const seen = new Set();
  const unique = allJobs.filter(j => {
    if (!j.external_id || seen.has(j.external_id)) return false;
    seen.add(j.external_id);
    return true;
  });

  console.log(`\n✅ Total unique jobs scraped: ${unique.length}`);
  return unique;
}

module.exports = { scrapeJobs };
