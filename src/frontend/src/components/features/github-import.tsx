'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { Github, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { GET_BUILDER } from '@/lib/graphql/queries/builders';
import { MY_GITHUB_REPOS } from '@/lib/graphql/queries/github';
import { IMPORT_GITHUB_PROJECT } from '@/lib/graphql/mutations/github';

interface GithubRepo {
  fullName: string;
  description: string | null;
  languages: string[];
  stars: number;
  url: string;
}

interface GetBuilderResult {
  user: { githubUsername: string | null } | null;
}

interface MyGithubReposResult {
  myGithubRepos: GithubRepo[];
}

interface ImportResult {
  projects: {
    importFromGithub: { id: string } | null;
  } | null;
}

export interface GithubImportProps {
  onProjectImported?: (projectId: string) => void;
}

const PER_PAGE = 20;

/* ─── Sub-components ─── */

function RepoSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 bg-surface-secondary rounded-xl" />
      ))}
    </div>
  );
}

function ConnectPrompt() {
  return (
    <div className="py-12 flex flex-col items-center gap-4 text-center">
      <Github className="text-ink-tertiary" size={32} />
      <h3 className="font-serif text-xl text-ink">Connect GitHub to import projects</h3>
      <p className="text-[14px] text-ink-secondary max-w-sm">
        Link your GitHub account to import repositories directly as projects.
      </p>
      <a
        href="/settings"
        className="inline-flex items-center gap-2 text-[13px] font-medium text-accent hover:text-accent-hover transition-colors"
      >
        Go to Settings
        <ChevronRight size={14} />
      </a>
    </div>
  );
}

/* ─── Main component ─── */

export function GithubImport({ onProjectImported }: GithubImportProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [role, setRole] = useState('');

  const { data: builderData, loading: builderLoading } = useQuery<GetBuilderResult>(
    GET_BUILDER,
    {
      variables: { username: user?.username ?? '' },
      skip: !user?.username,
    },
  );

  const githubUsername = builderData?.user?.githubUsername ?? null;
  const isGithubConnected = !!githubUsername;

  const { data: reposData, loading: reposLoading, fetchMore } = useQuery<MyGithubReposResult>(
    MY_GITHUB_REPOS,
    {
      variables: { page: 1, perPage: PER_PAGE },
      skip: !isGithubConnected,
    },
  );

  const [importProject, { loading: importing }] = useMutation<ImportResult>(IMPORT_GITHUB_PROJECT);

  const repos = reposData?.myGithubRepos ?? [];
  const hasMore = repos.length === PER_PAGE;

  const handleLoadMore = () => {
    fetchMore({
      variables: { page: Math.ceil(repos.length / PER_PAGE) + 1, perPage: PER_PAGE },
      updateQuery: (
        prev: MyGithubReposResult,
        { fetchMoreResult }: { fetchMoreResult?: MyGithubReposResult },
      ) => {
        if (!fetchMoreResult) return prev;
        return { myGithubRepos: [...prev.myGithubRepos, ...fetchMoreResult.myGithubRepos] };
      },
    });
  };

  const handleImport = async () => {
    if (!selectedRepo) return;
    const result = await importProject({
      variables: {
        repoFullName: selectedRepo.fullName,
        role: role || null,
      },
    });
    const projectId = result.data?.projects?.importFromGithub?.id;
    if (projectId) {
      onProjectImported?.(projectId);
      router.push(`/project/${projectId}`);
    }
  };

  const handleSelectRepo = (repo: GithubRepo) => {
    setSelectedRepo(repo);
    setRole('');
  };

  const handleCancelImport = () => {
    setSelectedRepo(null);
    setRole('');
  };

  if (builderLoading) return <RepoSkeleton />;
  if (!isGithubConnected) return <ConnectPrompt />;

  /* ─── Import preview ─── */
  if (selectedRepo) {
    return (
      <div className="space-y-6">
        <button
          className="text-[13px] text-ink-tertiary hover:text-ink transition-colors"
          onClick={handleCancelImport}
        >
          ← Back to repos
        </button>

        <div className="bg-surface-secondary rounded-2xl p-6 space-y-5">
          <h3 className="font-serif text-[18px] text-ink">Import preview</h3>

          <div className="space-y-3">
            <div>
              <span className="overline text-ink-tertiary text-[10px] tracking-widest uppercase">Title</span>
              <p className="text-[14px] font-medium text-ink mt-0.5">{selectedRepo.fullName}</p>
            </div>

            {selectedRepo.description && (
              <div>
                <span className="overline text-ink-tertiary text-[10px] tracking-widest uppercase">Description</span>
                <p className="text-[14px] text-ink-secondary mt-0.5">{selectedRepo.description}</p>
              </div>
            )}

            {selectedRepo.languages.length > 0 && (
              <div>
                <span className="overline text-ink-tertiary text-[10px] tracking-widest uppercase">Tech Stack</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedRepo.languages.map((lang) => (
                    <span
                      key={lang}
                      className="text-[11px] font-mono bg-surface-primary text-ink-tertiary px-2 py-0.5 rounded-full"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="overline text-ink-tertiary text-[10px] tracking-widest uppercase">GitHub Stars</span>
              <p className="text-[13px] font-mono text-ink-secondary mt-0.5">★ {selectedRepo.stars}</p>
            </div>
          </div>

          <div>
            <label
              htmlFor="import-role"
              className="overline text-ink-tertiary text-[10px] tracking-widest uppercase block mb-1"
            >
              Your Role
            </label>
            <input
              id="import-role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Founder, Lead Engineer"
              className="w-full text-[13px] bg-surface-elevated rounded-lg px-3 py-2 text-ink placeholder:text-ink-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent/50 shadow-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              className="text-[13px] font-medium text-ink-tertiary hover:text-ink px-3 py-1.5 rounded-lg transition-colors"
              onClick={handleCancelImport}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={importing}
              onClick={handleImport}
              className="text-[13px] font-medium bg-accent text-white px-4 py-1.5 rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {importing ? 'Importing…' : 'Import Project'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Repo list ─── */
  return (
    <div className="space-y-1">
      {reposLoading ? (
        <RepoSkeleton />
      ) : repos.length === 0 ? (
        <p className="text-[14px] text-ink-tertiary py-8 text-center">
          No repositories found.
        </p>
      ) : (
        <>
          {repos.map((repo) => (
            <button
              key={repo.fullName}
              data-testid="repo-row"
              onClick={() => handleSelectRepo(repo)}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-surface-secondary transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <p className="text-[14px] font-medium text-ink truncate">{repo.fullName}</p>
                  {repo.description && (
                    <p className="text-[12px] text-ink-secondary truncate">{repo.description}</p>
                  )}
                  {repo.languages.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {repo.languages.slice(0, 4).map((lang) => (
                        <span
                          key={lang}
                          className="text-[10px] font-mono bg-surface-secondary group-hover:bg-surface-primary text-ink-tertiary px-1.5 py-0.5 rounded-full transition-colors"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[12px] font-mono text-ink-tertiary shrink-0 mt-0.5">
                  ★ {repo.stars}
                </span>
              </div>
            </button>
          ))}

          {hasMore && (
            <div className="pt-4 flex justify-center">
              <button
                onClick={handleLoadMore}
                className="text-[13px] font-medium text-ink-tertiary hover:text-ink transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
