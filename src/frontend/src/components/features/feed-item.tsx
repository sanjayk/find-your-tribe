import { Star, Terminal } from 'lucide-react';

interface Actor {
  name: string;
  initials: string;
  avatarColor: string;
  avatarTextColor: string;
}

interface ShippedMetadata {
  project: {
    name: string;
    techStack: string[];
    stars: number;
    gradientColors: {
      from: string;
      via: string;
      to: string;
    };
  };
}

interface FormedTribeMetadata {
  tribe: {
    name: string;
    description: string;
    members: {
      initials: string;
      avatarColor: string;
      avatarTextColor: string;
    }[];
  };
}

interface StartedBuildingMetadata {
  project: {
    name: string;
    techStack: string[];
    iconGradient: {
      from: string;
      to: string;
    };
  };
}

interface JoinedMetadata {
  skills: string[];
}

type FeedItemMetadata =
  | ShippedMetadata
  | FormedTribeMetadata
  | StartedBuildingMetadata
  | JoinedMetadata;

export interface FeedItemProps {
  type: 'shipped' | 'formed-tribe' | 'started-building' | 'joined';
  actor: Actor;
  timestamp: string;
  metadata: FeedItemMetadata;
}

export function FeedItem({ type, actor, timestamp, metadata }: FeedItemProps) {
  const getActionText = () => {
    switch (type) {
      case 'shipped':
        return 'shipped';
      case 'formed-tribe':
        return 'formed a tribe';
      case 'started-building':
        return 'started building';
      case 'joined':
        return 'joined Find Your Tribe';
      default:
        return '';
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'shipped': {
        const { project } = metadata as ShippedMetadata;
        return (
          <div className="mt-3 bg-surface-elevated rounded-lg overflow-hidden shadow-sm">
            <div
              className={`aspect-[3/1] bg-gradient-to-br ${project.gradientColors.from} ${project.gradientColors.via} ${project.gradientColors.to} relative`}
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)',
                  backgroundSize: '30px 30px',
                }}
              ></div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-serif text-[16px] text-ink">
                  {project.name}
                </span>
                <div className="flex items-center gap-1 text-ink-tertiary">
                  <Star className="w-3.5 h-3.5" />
                  <span className="font-mono text-[12px]">{project.stars}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="font-mono text-[10px] text-ink-tertiary"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 'formed-tribe': {
        const { tribe } = metadata as FormedTribeMetadata;
        return (
          <div className="mt-3">
            <div className="font-serif text-[16px] text-ink mb-1.5">
              {tribe.name}
            </div>
            <p className="text-[12px] text-ink-secondary mb-3">
              {tribe.description}
            </p>
            <div className="flex -space-x-2">
              {tribe.members.map((member, index) => (
                <div
                  key={`${member.initials}-${index}`}
                  className={`avatar avatar-sm ${member.avatarColor} ${member.avatarTextColor} ring-2 ring-surface-secondary`}
                >
                  <span className="text-[10px]">{member.initials}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'started-building': {
        const { project } = metadata as StartedBuildingMetadata;
        return (
          <div className="mt-3 flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg bg-gradient-to-br ${project.iconGradient.from} ${project.iconGradient.to} flex items-center justify-center flex-shrink-0`}
            >
              <Terminal className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <div className="font-serif text-[15px] text-ink">
                {project.name}
              </div>
              <div className="flex gap-2 mt-0.5">
                {project.techStack.map((tech, index) => (
                  <div key={tech} className="flex items-center gap-2">
                    {index > 0 && (
                      <span className="text-ink-tertiary/30">/</span>
                    )}
                    <span className="font-mono text-[10px] text-ink-tertiary">
                      {tech}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 'joined': {
        const { skills } = metadata as JoinedMetadata;
        return (
          <div className="flex gap-1.5 mt-3">
            {skills.map((skill, index) => (
              <div key={skill} className="flex items-center gap-1.5">
                {index > 0 && <span className="text-ink-tertiary/30">/</span>}
                <span className="font-mono text-[11px] text-ink-tertiary">
                  {skill}
                </span>
              </div>
            ))}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <article className="py-5 first:pt-0">
      <div className="flex items-start gap-3.5">
        <div
          className={`avatar avatar-md ${actor.avatarColor} ${actor.avatarTextColor}`}
        >
          <span className="text-sm">{actor.initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-[14px] font-medium text-ink">
              {actor.name}
            </span>
            <span className="text-[12px] text-ink-tertiary">
              {getActionText()}
            </span>
            <span className="ml-auto text-[11px] text-ink-tertiary">
              {timestamp}
            </span>
          </div>
          {renderContent()}
        </div>
      </div>
    </article>
  );
}
