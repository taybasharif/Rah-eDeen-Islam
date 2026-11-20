module.exports = (req, res) => {
  const robots = `# Robots.txt for Rah-e-Deen-Islam (راہِ دینِ اسلام)
User-agent: *
Allow: /

Sitemap: https://rah-edeen-islam.vercel.app/sitemap.xml
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.status(200).send(robots);
};
