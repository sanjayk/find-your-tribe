'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Pencil, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TagTypeahead, type TagField } from './tag-typeahead';
import { UPDATE_PROJECT } from '@/lib/graphql/mutations/projects';

export interface BuiltWithSectionProps {
  domains: string[];
  aiTools: string[];
  buildStyle: string[];
  services: string[];
  editable?: boolean;
  projectId?: string;
  onUpdate?: (field: string, tags: string[]) => void;
}

type GroupKey = 'domains' | 'aiTools' | 'buildStyle' | 'services';

interface GroupConfig {
  key: GroupKey;
  label: string;
  tagField: TagField;
  pillClass: string;
  mutationKey: string;
  prompt: string;
}

const GROUPS: GroupConfig[] = [
  {
    key: 'domains',
    label: 'Domains',
    tagField: 'domains',
    pillClass: 'bg-surface-secondary text-ink-secondary',
    mutationKey: 'domains',
    prompt: 'Add your tech domains',
  },
  {
    key: 'aiTools',
    label: 'AI Tools',
    tagField: 'ai_tools',
    pillClass: 'bg-accent-subtle text-accent',
    mutationKey: 'aiTools',
    prompt: 'What AI tools did you use?',
  },
  {
    key: 'buildStyle',
    label: 'Build Style',
    tagField: 'build_style',
    pillClass: 'bg-surface-secondary text-ink-tertiary',
    mutationKey: 'buildStyle',
    prompt: 'How did you build this?',
  },
  {
    key: 'services',
    label: 'Services',
    tagField: 'services',
    pillClass: 'font-mono bg-surface-secondary text-ink-secondary',
    mutationKey: 'services',
    prompt: 'What services did you integrate?',
  },
];

export function BuiltWithSection({
  domains,
  aiTools,
  buildStyle,
  services,
  editable = false,
  projectId,
  onUpdate,
}: BuiltWithSectionProps) {
  const [editingField, setEditingField] = useState<GroupKey | null>(null);
  const [updateProject] = useMutation(UPDATE_PROJECT);

  const tagsByKey: Record<GroupKey, string[]> = { domains, aiTools, buildStyle, services };

  const allEmpty =
    domains.length === 0 &&
    aiTools.length === 0 &&
    buildStyle.length === 0 &&
    services.length === 0;

  if (!editable && allEmpty) return null;

  const handleTagsChange = (group: GroupConfig, newTags: string[]) => {
    onUpdate?.(group.key, newTags);
    if (projectId) {
      updateProject({
        variables: {
          id: projectId,
          input: { [group.mutationKey]: newTags },
        },
      });
    }
  };

  return (
    <section className="mb-12">
      <div className="accent-line text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary mb-6">
        Built With
      </div>

      <div className="space-y-8">
        {GROUPS.map((group) => {
          const groupTags = tagsByKey[group.key];
          const isEmpty = groupTags.length === 0;

          if (!editable && isEmpty) return null;

          const isEditing = editingField === group.key;

          return (
            <div key={group.key}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-[13px] font-medium text-ink-secondary">
                  {group.label}
                </h3>
                {editable && !isEmpty && !isEditing && (
                  <button
                    type="button"
                    onClick={() => setEditingField(group.key)}
                    className="text-ink-tertiary hover:text-ink-secondary transition-colors"
                    aria-label={`Edit ${group.label}`}
                  >
                    <Pencil size={12} />
                  </button>
                )}
              </div>

              {isEditing ? (
                <div>
                  <TagTypeahead
                    field={group.tagField}
                    selectedTags={groupTags}
                    onTagsChange={(newTags) => handleTagsChange(group, newTags)}
                    placeholder={group.prompt}
                  />
                  <button
                    type="button"
                    onClick={() => setEditingField(null)}
                    className="mt-2 text-[12px] text-ink-tertiary hover:text-ink-secondary transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : isEmpty && editable ? (
                <button
                  type="button"
                  onClick={() => setEditingField(group.key)}
                  className="flex items-center gap-1.5 text-[13px] text-ink-tertiary hover:text-ink-secondary transition-colors"
                  aria-label={`Add ${group.label}`}
                >
                  <Plus size={13} />
                  {group.prompt}
                </button>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {groupTags.map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        'text-[11px] px-2.5 py-0.5 rounded-md',
                        group.pillClass
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
