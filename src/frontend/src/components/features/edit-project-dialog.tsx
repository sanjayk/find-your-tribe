'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client/react';
import { PlusIcon, XIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  UPDATE_PROJECT,
  DELETE_PROJECT,
} from '@/lib/graphql/mutations/projects';
import type { Project, ProjectStatus } from '@/lib/graphql/types';

interface EditProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (project: Project) => void;
  onDeleted?: () => void;
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ARCHIVED', label: 'Archived' },
];

type LinkPair = { key: string; value: string };

function linksToRecord(pairs: LinkPair[]): Record<string, string> {
  return pairs.reduce<Record<string, string>>((acc, { key, value }) => {
    if (key.trim()) acc[key.trim()] = value;
    return acc;
  }, {});
}

function recordToLinks(links: Record<string, string>): LinkPair[] {
  const pairs = Object.entries(links).map(([key, value]) => ({ key, value }));
  return pairs.length > 0 ? pairs : [{ key: '', value: '' }];
}

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: EditProjectDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState(project.title);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [description, setDescription] = useState(project.description ?? '');
  const [role, setRole] = useState(project.role ?? '');
  const [links, setLinks] = useState<LinkPair[]>(recordToLinks(project.links));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [updateProject, { loading: updateLoading }] =
    useMutation(UPDATE_PROJECT);
  const [deleteProject, { loading: deleteLoading }] =
    useMutation(DELETE_PROJECT);

  const loading = updateLoading || deleteLoading;

  // Re-initialize form when project identity changes
  useEffect(() => {
    setTitle(project.title);
    setStatus(project.status);
    setDescription(project.description ?? '');
    setRole(project.role ?? '');
    setLinks(recordToLinks(project.links));
    setShowDeleteConfirm(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await updateProject({
        variables: {
          id: project.id,
          input: {
            title,
            status,
            description: description || null,
            role: role || null,
            links: linksToRecord(links),
          },
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedProject = (result.data as any)?.projects
        ?.updateProject as Project | undefined;
      onOpenChange(false);
      if (updatedProject) onUpdated?.(updatedProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteProject({ variables: { id: project.id } });
      onDeleted?.();
      onOpenChange(false);
      const profilePath = project.owner
        ? `/profile/${project.owner.username}`
        : '/';
      router.push(profilePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const addLink = () =>
    setLinks((prev) => [...prev, { key: '', value: '' }]);

  const updateLink = (
    index: number,
    field: 'key' | 'value',
    val: string,
  ) => {
    setLinks((prev) =>
      prev.map((pair, i) => (i === index ? { ...pair, [field]: val } : pair)),
    );
  };

  const removeLink = (index: number) => {
    setLinks((prev) =>
      prev.length > 1
        ? prev.filter((_, i) => i !== index)
        : [{ key: '', value: '' }],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-surface-elevated overflow-y-auto max-h-[90vh]">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <p className="overline text-accent mb-2">EDIT PROJECT</p>
            <DialogTitle className="font-serif text-[28px] leading-tight text-ink font-normal">
              Update project details
            </DialogTitle>
          </div>

          <hr className="border-surface-secondary" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label
                htmlFor="project-title"
                className="overline text-ink-tertiary block"
              >
                TITLE *
              </label>
              <Input
                id="project-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="bg-surface-primary border-0 shadow-none"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label
                htmlFor="project-status"
                className="overline text-ink-tertiary block"
              >
                STATUS
              </label>
              <select
                id="project-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full rounded-lg bg-surface-primary px-3 py-2 text-sm text-ink outline-none appearance-none cursor-pointer"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label
                htmlFor="project-description"
                className="overline text-ink-tertiary block"
              >
                DESCRIPTION
              </label>
              <textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are you building and why?"
                rows={3}
                className="w-full rounded-lg bg-surface-primary px-3 py-2 text-sm text-ink placeholder:text-ink-tertiary outline-none resize-none"
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label
                htmlFor="project-role"
                className="overline text-ink-tertiary block"
              >
                ROLE
              </label>
              <Input
                id="project-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Lead Engineer, Designer"
                className="bg-surface-primary border-0 shadow-none"
              />
            </div>

            {/* Links */}
            <div className="space-y-2">
              <p className="overline text-ink-tertiary">LINKS</p>
              <div className="space-y-2">
                {links.map((pair, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      value={pair.key}
                      onChange={(e) =>
                        updateLink(index, 'key', e.target.value)
                      }
                      placeholder="Label"
                      className="bg-surface-primary border-0 shadow-none w-32"
                      aria-label={`Link label ${index + 1}`}
                    />
                    <Input
                      value={pair.value}
                      onChange={(e) =>
                        updateLink(index, 'value', e.target.value)
                      }
                      placeholder="https://..."
                      className="bg-surface-primary border-0 shadow-none flex-1"
                      aria-label={`Link URL ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      className="text-ink-tertiary hover:text-error transition-colors p-1 shrink-0"
                      aria-label={`Remove link ${index + 1}`}
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addLink}
                className="flex items-center gap-1.5 text-sm text-ink-secondary hover:text-accent transition-colors"
              >
                <PlusIcon className="size-4" />
                Add link
              </button>
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            {/* Form Footer */}
            <div className="flex justify-end gap-3 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-ink text-ink-inverse hover:bg-ink/90"
              >
                {updateLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>

          {/* Danger Zone */}
          <hr className="border-surface-secondary" />
          <div className="space-y-3">
            <p className="overline text-ink-tertiary">DANGER ZONE</p>
            {!showDeleteConfirm ? (
              <Button
                type="button"
                variant="ghost"
                className="text-error hover:text-error hover:bg-error-subtle"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Project
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="body-sm text-ink-secondary">
                  Are you sure? This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-error hover:text-error hover:bg-error-subtle"
                    onClick={handleDelete}
                    disabled={loading}
                  >
                    {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
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
