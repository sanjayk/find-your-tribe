'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UPDATE_TRIBE } from '@/lib/graphql/mutations/tribes';
import type { TribeStatus } from '@/lib/graphql/types';

interface TribeData {
  id: string;
  name: string;
  mission: string | null;
  maxMembers: number;
  status: TribeStatus;
}

interface EditTribeModalProps {
  isOpen: boolean;
  tribe: TribeData;
  onClose: () => void;
  onUpdated?: () => void;
}

const STATUS_OPTIONS: {
  value: TribeStatus;
  label: string;
  description: string;
}[] = [
  { value: 'OPEN', label: 'Open', description: 'looking for members' },
  { value: 'ACTIVE', label: 'Active', description: 'full team, building' },
  { value: 'ALUMNI', label: 'Alumni', description: 'past collaboration' },
];

export function EditTribeModal({
  isOpen,
  tribe,
  onClose,
  onUpdated,
}: EditTribeModalProps) {
  const [name, setName] = useState(tribe.name);
  const [mission, setMission] = useState(tribe.mission ?? '');
  const [maxMembers, setMaxMembers] = useState(tribe.maxMembers);
  const [status, setStatus] = useState<TribeStatus>(tribe.status);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [updateTribe, { loading }] = useMutation(UPDATE_TRIBE);

  // Re-initialize form when tribe identity changes
  useEffect(() => {
    setName(tribe.name);
    setMission(tribe.mission ?? '');
    setMaxMembers(tribe.maxMembers);
    setStatus(tribe.status);
    setError(null);
    setShowArchiveConfirm(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tribe.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const variables: Record<string, unknown> = { id: tribe.id };
    if (name !== tribe.name) variables.name = name;
    if (mission !== (tribe.mission ?? '')) variables.mission = mission || null;
    if (maxMembers !== tribe.maxMembers) variables.maxMembers = maxMembers;
    if (status !== tribe.status) variables.status = status;

    try {
      await updateTribe({ variables });
      onUpdated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handleArchive = async () => {
    setError(null);
    try {
      await updateTribe({ variables: { id: tribe.id, status: 'ALUMNI' } });
      onUpdated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-surface-elevated">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <p className="overline text-accent mb-2">EDIT TRIBE</p>
            <DialogTitle className="font-serif text-[28px] leading-tight text-ink font-normal">
              Update your team
            </DialogTitle>
          </div>

          <hr className="border-surface-secondary" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tribe Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="tribe-name"
                className="overline text-ink-tertiary block"
              >
                TRIBE NAME *
              </label>
              <Input
                id="tribe-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Mission */}
            <div className="space-y-1.5">
              <label
                htmlFor="tribe-mission"
                className="overline text-ink-tertiary block"
              >
                MISSION
              </label>
              <textarea
                id="tribe-mission"
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                placeholder="What are you building and why? Describe the vision in 2-3 sentences."
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            {/* Max Members */}
            <div className="space-y-1.5">
              <label
                htmlFor="tribe-max-members"
                className="overline text-ink-tertiary block"
              >
                MAX MEMBERS
              </label>
              <Input
                id="tribe-max-members"
                type="number"
                min={1}
                value={maxMembers}
                onChange={(e) =>
                  setMaxMembers(parseInt(e.target.value, 10))
                }
                className="w-24"
              />
            </div>

            <hr className="border-surface-secondary" />

            {/* Status Radio Group */}
            <div className="space-y-3">
              <p className="overline text-ink-tertiary">STATUS</p>
              <div className="flex flex-col gap-3">
                {STATUS_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="tribe-status"
                      value={option.value}
                      checked={status === option.value}
                      onChange={() => setStatus(option.value)}
                      className="w-4 h-4 accent-accent"
                    />
                    <span className="text-sm font-medium text-ink">
                      {option.label}
                    </span>
                    <span className="body-sm text-ink-secondary">
                      — {option.description}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            {/* Form Footer */}
            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>

          {/* Danger Zone */}
          <hr className="border-surface-secondary" />
          <div className="space-y-3">
            <p className="overline text-ink-tertiary">DANGER ZONE</p>
            {!showArchiveConfirm ? (
              <Button
                type="button"
                variant="ghost"
                className="text-error hover:text-error hover:bg-error-subtle"
                onClick={() => setShowArchiveConfirm(true)}
              >
                Archive this tribe
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="body-sm text-ink-secondary">
                  Are you sure? This will mark the tribe as a past
                  collaboration.
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowArchiveConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-error hover:text-error hover:bg-error-subtle"
                    onClick={handleArchive}
                    disabled={loading}
                  >
                    Confirm Archive
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
