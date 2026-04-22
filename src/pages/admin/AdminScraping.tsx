import ScrapingHealthPanel from '@/components/admin/ScrapingHealthPanel';

export default function AdminScraping() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Scraping</h1>
        <p className="text-sm text-muted-foreground">Firecrawl + city_prices freshness across cities</p>
      </div>
      <ScrapingHealthPanel />
    </div>
  );
}
