import { SearchBar } from "@/components/ui/SearchBar";

interface HeroSectionProps {
  title: string;
  subtitle: string;
  datasetCount: number;
}

export function HeroSection({ title, subtitle, datasetCount }: HeroSectionProps) {
  return (
    <section className="bg-hero-bg text-hero-text py-16 md:py-24 -mx-[calc((100vw-100%)/2)] px-[calc((100vw-100%)/2)]">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">{title}</h1>
        <p className="text-lg md:text-xl text-hero-muted mb-8">{subtitle}</p>
        <div className="max-w-xl mx-auto">
          <SearchBar placeholder="Search datasets..." />
        </div>
        <p className="mt-4 text-sm text-hero-muted">
          {datasetCount.toLocaleString()} dataset{datasetCount !== 1 ? "s" : ""} available
        </p>
      </div>
    </section>
  );
}
