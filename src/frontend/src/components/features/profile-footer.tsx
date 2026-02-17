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
}

export function ProfileFooter({ tribes, links, info }: ProfileFooterProps) {
  return (
    <footer
      className="grid grid-cols-3 gap-8 border-t border-surface-secondary"
      style={{ padding: '40px 0 80px' }}
      data-testid="profile-footer"
    >
      {/* Tribes column */}
      <div>
        <div
          className="font-medium uppercase text-ink-tertiary"
          style={{ fontSize: '11px', letterSpacing: '0.06em', marginBottom: '10px' }}
          data-testid="tribes-header"
        >
          Tribes
        </div>
        {tribes.map((tribe, index) => (
          <div
            key={tribe.name}
            className="flex flex-col gap-0.5"
            style={index > 0 ? { marginTop: '8px' } : undefined}
            data-testid="tribe-item"
          >
            <span className="font-medium text-[13px]">{tribe.name}</span>
            <span className="text-[12px] text-ink-tertiary">
              {tribe.memberCount} builder{tribe.memberCount !== 1 ? 's' : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Links column */}
      <div>
        <div
          className="font-medium uppercase text-ink-tertiary"
          style={{ fontSize: '11px', letterSpacing: '0.06em', marginBottom: '10px' }}
          data-testid="links-header"
        >
          Links
        </div>
        <div className="flex flex-col gap-2">
          {links.map((link) => (
            <div key={link.label} data-testid="link-item">
              <div
                className="uppercase text-ink-tertiary"
                style={{ fontSize: '10px', letterSpacing: '0.04em' }}
              >
                {link.label}
              </div>
              <div className="text-[13px]">
                <a
                  href={link.href}
                  className="text-accent no-underline"
                  data-testid="link-value"
                >
                  {link.value}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info column */}
      <div>
        <div
          className="font-medium uppercase text-ink-tertiary"
          style={{ fontSize: '11px', letterSpacing: '0.06em', marginBottom: '10px' }}
          data-testid="info-header"
        >
          Info
        </div>
        <div className="flex flex-col gap-2">
          {info.map((item) => (
            <div key={item.label} data-testid="info-item">
              <div
                className="uppercase text-ink-tertiary"
                style={{ fontSize: '10px', letterSpacing: '0.04em' }}
              >
                {item.label}
              </div>
              <div className="text-[13px] text-ink-secondary" data-testid="info-value">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
