import Link from 'next/link';

export interface TribeItem {
  name: string;
  memberCount: number;
}

export interface LinkItem {
  label: string; // e.g. "GitHub"
  value: string; // e.g. "@mayachen"
  href: string;
}

export interface InfoItem {
  label: string; // e.g. "Timezone"
  value: string; // e.g. "PST · UTC-8"
}

export interface ProfileFooterProps {
  tribes: TribeItem[];
  links: LinkItem[];
  info: InfoItem[];
  isOwnProfile?: boolean;
}

export function ProfileFooter({ tribes, links, info, isOwnProfile = false }: ProfileFooterProps) {
  return (
    <footer
      className="grid grid-cols-3 gap-3 sm:gap-8 border-t border-surface-secondary pt-8 sm:pt-10 pb-12 sm:pb-20"
      data-testid="profile-footer"
    >
      {/* Tribes column */}
      <div>
        <div
          className="font-medium uppercase text-ink-tertiary text-[11px] tracking-[0.06em] mb-2.5"
          data-testid="tribes-header"
        >
          Tribes
        </div>
        {tribes.length > 0 ? (
          tribes.map((tribe, index) => (
            <div
              key={tribe.name}
              className={`flex flex-col gap-0.5${index > 0 ? ' mt-2' : ''}`}
              data-testid="tribe-item"
            >
              <span className="font-medium text-[13px]">{tribe.name}</span>
              <span className="text-[12px] text-ink-tertiary">
                {tribe.memberCount} builder{tribe.memberCount !== 1 ? 's' : ''}
              </span>
            </div>
          ))
        ) : (
          <p className="text-ink-tertiary text-[13px]">No tribe yet</p>
        )}
      </div>

      {/* Links column */}
      <div>
        <div
          className="font-medium uppercase text-ink-tertiary text-[11px] tracking-[0.06em] mb-2.5"
          data-testid="links-header"
        >
          Links
        </div>
        {links.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            {links.map((link, index) => (
              <span key={link.label} data-testid="link-item">
                <a
                  href={link.href}
                  className="text-[13px] text-accent hover:text-accent-hover transition-colors"
                  data-testid="link-value"
                >
                  {link.label}
                </a>
                {index < links.length - 1 && (
                  <span className="text-ink-tertiary/40 ml-1.5">·</span>
                )}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-ink-tertiary text-[13px]">
            None added{isOwnProfile && (
              <> · <Link href="/settings" className="text-ink-tertiary/70 underline decoration-ink-tertiary/30 underline-offset-2 hover:text-ink-secondary">Edit in settings</Link></>
            )}
          </p>
        )}
      </div>

      {/* Info column */}
      <div>
        <div
          className="font-medium uppercase text-ink-tertiary text-[11px] tracking-[0.06em] mb-2.5"
          data-testid="info-header"
        >
          Info
        </div>
        <div className="flex flex-col gap-3">
          {info.map((item) => (
            <div key={item.label} data-testid="info-item">
              <div className="uppercase text-ink-tertiary text-[10px] tracking-[0.04em]">
                {item.label}
              </div>
              <div className="text-[12px] text-ink-secondary/80" data-testid="info-value">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
