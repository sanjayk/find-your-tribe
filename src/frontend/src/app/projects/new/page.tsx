'use client';

import { useState, type FormEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CREATE_PROJECT } from '@/lib/graphql/mutations/projects';

/* ─── Constants ─── */

const STATUS_OPTIONS = [
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'ARCHIVED', label: 'Archived' },
] as const;

const PRESET_LINK_KEYS = ['website', 'github', 'demo', 'docs'] as const;

const INPUT_CLASSES =
  'w-full bg-surface-elevated shadow-xs rounded-lg px-4 py-3 text-[14px] text-ink placeholder:text-ink-tertiary outline-none transition-colors focus:ring-2 focus:ring-accent/30';

const SELECT_CLASSES =
  'w-full bg-surface-elevated shadow-xs rounded-lg px-4 py-3 text-[14px] text-ink appearance-none outline-none transition-colors focus:ring-2 focus:ring-accent/30';

const LABEL_CLASSES = 'text-[13px] font-medium text-ink-secondary mb-1.5 block';

/* ─── Types ─── */

interface LinkRow {
  id: number;
  key: string;
  url: string;
  isCustom: boolean;
}

interface CreateProjectData {
  projects: {
    createProject: {
      id: string;
    };
  };
}

/* ─── Component ─── */

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('IN_PROGRESS');
  const [description, setDescription] = useState('');
  const [role, setRole] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [linkRows, setLinkRows] = useState<LinkRow[]>(() =>
    PRESET_LINK_KEYS.map((key, i) => ({ id: i, key, url: '', isCustom: false })),
  );

  const [createProject, { loading }] = useMutation<CreateProjectData>(CREATE_PROJECT, {
    onCompleted: (data) => {
      const project = data.projects.createProject;
      const fromOnboarding = searchParams.get('from') === 'onboarding';
      if (fromOnboarding) {
        router.push('/onboarding');
      } else {
        router.push(`/project/${project.id}`);
      }
    },
    onError: (err) => {
      setError(err.message || 'Something went wrong. Please try again.');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }
    setTitleError(null);

    const links: Record<string, string> = {};
    for (const row of linkRows) {
      if (row.key.trim() && row.url.trim()) {
        links[row.key.trim()] = row.url.trim();
      }
    }

    createProject({
      variables: {
        input: {
          title: title.trim(),
          status,
          description: description.trim() || null,
          role: role.trim() || null,
          links,
        },
      },
    });
  }

  function addCustomLink() {
    setLinkRows((prev) => [
      ...prev,
      { id: Date.now(), key: '', url: '', isCustom: true },
    ]);
  }

  function removeLink(id: number) {
    setLinkRows((prev) => prev.filter((row) => row.id !== id));
  }

  function updateLink(id: number, field: 'key' | 'url', value: string) {
    setLinkRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  return (
    <div className="mx-auto max-w-[640px] px-6 py-16">
      <h1 className="font-serif text-[40px] leading-tight text-ink mb-10">
        New Project
      </h1>

      {error && (
        <div className="bg-error-subtle text-error rounded-lg p-3 text-[13px] mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className={LABEL_CLASSES}>
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What did you build?"
            className={`${INPUT_CLASSES} font-serif text-[18px]`}
          />
          {titleError && (
            <p className="mt-1.5 text-[12px] text-error">{titleError}</p>
          )}
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className={LABEL_CLASSES}>
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={SELECT_CLASSES}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className={LABEL_CLASSES}>
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you built and the impact..."
            rows={4}
            className={`${INPUT_CLASSES} resize-none`}
          />
          <p className="mt-1.5 text-[12px] text-ink-tertiary">
            A project is anything you&apos;ve shipped — code, design, strategy, operations, or any
            tangible work product.
          </p>
        </div>

        {/* Role */}
        <div>
          <label htmlFor="role" className={LABEL_CLASSES}>
            Your role
          </label>
          <input
            id="role"
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Lead Engineer, Product Designer"
            className={INPUT_CLASSES}
          />
        </div>

        {/* Links */}
        <div>
          <p className={`${LABEL_CLASSES} mb-3`}>Links</p>
          <div className="space-y-2.5">
            {linkRows.map((row, index) => (
              <div key={row.id} className="flex items-center gap-3">
                {row.isCustom ? (
                  <input
                    type="text"
                    aria-label={`Link ${index + 1} key`}
                    value={row.key}
                    onChange={(e) => updateLink(row.id, 'key', e.target.value)}
                    placeholder="label"
                    className="w-[112px] shrink-0 bg-surface-elevated shadow-xs rounded-lg px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-tertiary outline-none transition-colors focus:ring-2 focus:ring-accent/30"
                  />
                ) : (
                  <span className="w-[112px] shrink-0 text-[13px] font-medium text-ink-secondary">
                    {row.key}
                  </span>
                )}
                <input
                  type="url"
                  aria-label={row.isCustom ? `Link ${index + 1} URL` : `${row.key} URL`}
                  value={row.url}
                  onChange={(e) => updateLink(row.id, 'url', e.target.value)}
                  placeholder="https://"
                  className="flex-1 bg-surface-elevated shadow-xs rounded-lg px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-tertiary outline-none transition-colors focus:ring-2 focus:ring-accent/30"
                />
                {row.isCustom && (
                  <button
                    type="button"
                    aria-label={`Remove link ${index + 1}`}
                    onClick={() => removeLink(row.id)}
                    className="text-ink-tertiary hover:text-error transition-colors text-[20px] leading-none shrink-0"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addCustomLink}
            className="mt-3 text-[13px] text-accent hover:text-accent-hover transition-colors"
          >
            + Add link
          </button>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-ink text-ink-inverse rounded-lg px-8 py-3 text-[14px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}
