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
          className="text-ink-secondary bg-surface-secondary rounded-[6px]"
          style={{ fontSize: '12px', padding: '5px 12px' }}
          data-testid="domain-tag"
        >
          {domain}
        </span>
      ))}
    </div>
  );
}
