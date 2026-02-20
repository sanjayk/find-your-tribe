'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Circle, Diamond, Rocket, Flag, X, Plus } from 'lucide-react';
import { ADD_MILESTONE, DELETE_MILESTONE } from '@/lib/graphql/mutations/projects';
import type { ProjectMilestone } from '@/lib/graphql/types';

type MilestoneType = 'start' | 'milestone' | 'deploy' | 'launch';

export interface BuildTimelineProps {
  milestones: ProjectMilestone[];
  editable?: boolean;
  projectId?: string;
  onMilestoneAdded?: (milestone: ProjectMilestone) => void;
  onMilestoneDeleted?: (milestoneId: string) => void;
}

const TYPE_CONFIG: Record<MilestoneType, { icon: React.ReactNode; color: string }> = {
  start: { icon: <Circle size={12} />, color: 'text-in-progress' },
  milestone: { icon: <Diamond size={12} />, color: 'text-accent' },
  deploy: { icon: <Rocket size={12} />, color: 'text-shipped' },
  launch: { icon: <Flag size={12} />, color: 'text-shipped' },
};

const MILESTONE_TYPE_OPTIONS: MilestoneType[] = ['start', 'milestone', 'deploy', 'launch'];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function BuildTimeline({
  milestones,
  editable = false,
  projectId,
  onMilestoneAdded,
  onMilestoneDeleted,
}: BuildTimelineProps) {
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formType, setFormType] = useState<MilestoneType>('milestone');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [addMilestone] = useMutation(ADD_MILESTONE);
  const [deleteMilestone] = useMutation(DELETE_MILESTONE);

  const sorted = [...milestones].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (!editable && sorted.length === 0) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !formTitle || !formDate) return;

    const result = await addMilestone({
      variables: {
        projectId,
        input: { title: formTitle, date: formDate, milestoneType: formType },
      },
    });

    const data = result.data as { projects?: { addMilestone?: ProjectMilestone } } | null;
    const added = data?.projects?.addMilestone;
    if (added) {
      onMilestoneAdded?.(added);
      setFormTitle('');
      setFormDate('');
      setFormType('milestone');
      setShowForm(false);
    }
  };

  const handleDeleteClick = async (milestoneId: string) => {
    if (pendingDeleteId === milestoneId) {
      await deleteMilestone({ variables: { milestoneId } });
      onMilestoneDeleted?.(milestoneId);
      setPendingDeleteId(null);
    } else {
      setPendingDeleteId(milestoneId);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setFormTitle('');
    setFormDate('');
    setFormType('milestone');
  };

  return (
    <div className="relative">
      {sorted.length > 0 && (
        <div
          className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-surface-secondary"
          aria-hidden="true"
        />
      )}

      <div className="space-y-5">
        {sorted.map((milestone) => {
          const typeConfig = TYPE_CONFIG[milestone.milestoneType] ?? TYPE_CONFIG.milestone;
          const isPendingDelete = pendingDeleteId === milestone.id;

          return (
            <div
              key={milestone.id}
              data-testid="milestone-item"
              className="relative flex items-start gap-4 pl-9 group"
            >
              {/* Type icon dot — centered on the timeline line */}
              <div
                className={`absolute left-0 top-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-surface-primary z-10 ${typeConfig.color}`}
                aria-label={`${milestone.milestoneType} milestone`}
              >
                {typeConfig.icon}
              </div>

              {/* Milestone content */}
              <div className="flex-1 flex items-start justify-between gap-3 min-w-0 pb-1">
                <span className="text-[13px] font-sans font-medium text-ink leading-snug">
                  {milestone.title}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-ink-tertiary whitespace-nowrap">
                    {formatDate(milestone.date)}
                  </span>

                  {editable && !isPendingDelete && (
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-tertiary hover:text-error rounded p-0.5"
                      onClick={() => handleDeleteClick(milestone.id)}
                      aria-label="Delete milestone"
                    >
                      <X size={12} />
                    </button>
                  )}

                  {editable && isPendingDelete && (
                    <div className="flex items-center gap-1.5">
                      <button
                        className="text-[11px] font-sans text-error hover:underline"
                        onClick={() => handleDeleteClick(milestone.id)}
                      >
                        Confirm
                      </button>
                      <button
                        className="text-[11px] font-sans text-ink-tertiary hover:text-ink"
                        onClick={() => setPendingDeleteId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Owner-mode controls */}
      {editable && (
        <div className={sorted.length > 0 ? 'pl-9 mt-5' : ''}>
          {!showForm ? (
            sorted.length === 0 ? (
              <div className="py-6 space-y-3">
                <p className="text-[13px] text-ink-tertiary">
                  No milestones yet. Mark key moments in your build.
                </p>
                <button
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:text-accent-hover transition-colors"
                  onClick={() => setShowForm(true)}
                >
                  <Plus size={14} />
                  Add first milestone
                </button>
              </div>
            ) : (
              <button
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-tertiary hover:text-ink transition-colors"
                onClick={() => setShowForm(true)}
              >
                <Plus size={14} />
                Add milestone
              </button>
            )
          ) : (
            <form onSubmit={handleAdd} className="space-y-3 bg-surface-secondary rounded-xl p-4 mt-5">
              <div>
                <label
                  htmlFor="milestone-title"
                  className="overline text-ink-tertiary block mb-1"
                >
                  TITLE
                </label>
                <input
                  id="milestone-title"
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. First commit"
                  required
                  className="w-full text-[13px] bg-surface-elevated rounded-lg px-3 py-2 text-ink placeholder:text-ink-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent/50 shadow-xs"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label
                    htmlFor="milestone-date"
                    className="overline text-ink-tertiary block mb-1"
                  >
                    DATE
                  </label>
                  <input
                    id="milestone-date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full text-[13px] bg-surface-elevated rounded-lg px-3 py-2 text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent/50 shadow-xs"
                  />
                </div>

                <div>
                  <label
                    htmlFor="milestone-type"
                    className="overline text-ink-tertiary block mb-1"
                  >
                    TYPE
                  </label>
                  <select
                    id="milestone-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as MilestoneType)}
                    className="text-[13px] bg-surface-elevated rounded-lg px-3 py-2 text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent/50 shadow-xs"
                  >
                    {MILESTONE_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="text-[13px] font-medium text-ink-tertiary hover:text-ink px-3 py-1.5 rounded-lg transition-colors"
                  onClick={resetForm}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-[13px] font-medium text-accent hover:text-accent-hover px-3 py-1.5 rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
