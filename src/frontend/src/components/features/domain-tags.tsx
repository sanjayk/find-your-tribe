export interface DomainTagsProps {
  domains: string[];
}

export function DomainTags({ domains }: DomainTagsProps) {
  if (domains.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-3.5" data-testid="domain-tags">
      {domains.map((domain) => (
        <span
          key={domain}
          className="text-[12px] text-ink-secondary bg-surface-secondary rounded-[6px] py-[5px] px-3"
          data-testid="domain-tag"
        >
          {domain}
        </span>
      ))}
    </div>
  );
}
