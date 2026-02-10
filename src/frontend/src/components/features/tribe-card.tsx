interface TribeMember {
  name: string;
  initials: string;
  avatarColor: string;
  avatarTextColor: string;
}

interface TribeCardProps {
  name: string;
  description: string;
  members: TribeMember[];
  techStack: string[];
  openRolesCount: number;
}

export function TribeCard({
  name,
  description,
  members,
  techStack,
}: TribeCardProps) {
  const memberCount = members.length;
  const memberText = memberCount === 1 ? 'member' : 'members';

  return (
    <div className="mt-3">
      <div className="font-serif text-[16px] text-ink mb-1.5">{name}</div>
      <p className="text-[12px] text-ink-secondary mb-3">
        {memberCount} {memberText}. {description}
      </p>
      <div className="flex -space-x-2">
        {members.map((member, index) => (
          <div
            key={index}
            className={`avatar avatar-sm ${member.avatarColor} ${member.avatarTextColor} ring-2 ring-surface-secondary`}
          >
            <span className="text-[10px]">{member.initials}</span>
          </div>
        ))}
      </div>
      {techStack.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {techStack.map((tech, index) => (
            <span
              key={index}
              className="font-mono text-[11px] bg-surface-secondary text-ink-secondary px-2.5 py-1 rounded-md"
            >
              {tech}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
