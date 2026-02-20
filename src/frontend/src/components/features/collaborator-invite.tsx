'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation, useLazyQuery } from '@apollo/client/react';
import { Search, Plus, Link, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEARCH_USERS } from '@/lib/graphql/queries/invitations';
import {
  INVITE_COLLABORATOR,
  GENERATE_INVITE_LINK,
} from '@/lib/graphql/mutations/projects';
import type {
  Collaborator,
  ProjectOwner,
  SearchUsersData,
} from '@/lib/graphql/types';

const DEBOUNCE_MS = 300;
const MAX_RESULTS = 5;
const COPIED_DISPLAY_MS = 2000;

interface CollaboratorInviteProps {
  projectId: string;
  existingCollaborators: Collaborator[];
  onCollaboratorInvited?: (collaborator: Collaborator) => void;
}

export function CollaboratorInvite({
  projectId,
  existingCollaborators,
  onCollaboratorInvited,
}: CollaboratorInviteProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<ProjectOwner | null>(null);
  const [role, setRole] = useState('');
  const [copied, setCopied] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchUsers, { data: searchData }] =
    useLazyQuery<SearchUsersData>(SEARCH_USERS);

  const [inviteCollaborator, { loading: inviting }] = useMutation<{
    projects: { inviteCollaborator: Collaborator };
  }>(INVITE_COLLABORATOR);

  const [generateInviteLink, { loading: generatingLink }] = useMutation<{
    projects: { generateInviteLink: string };
  }>(GENERATE_INVITE_LINK);

  const existingIds = new Set(
    existingCollaborators.map((c) => c.user.id)
  );

  const filteredResults = (searchData?.searchUsers ?? []).filter(
    (u: ProjectOwner) => !existingIds.has(u.id)
  );

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => {
      if (prev) {
        // Collapsing — reset state
        setQuery('');
        setSelectedUser(null);
        setRole('');
      }
      return !prev;
    });
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setQuery(value);
      setSelectedUser(null);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (value.trim().length === 0) return;

      debounceRef.current = setTimeout(() => {
        searchUsers({
          variables: { query: value.trim(), limit: MAX_RESULTS },
        });
      }, DEBOUNCE_MS);
    },
    [searchUsers]
  );

  const handleSelectUser = useCallback((user: ProjectOwner) => {
    setSelectedUser(user);
    setQuery('');
  }, []);

  const handleSendInvite = useCallback(async () => {
    if (!selectedUser) return;

    try {
      const result = await inviteCollaborator({
        variables: {
          projectId,
          userId: selectedUser.id,
          role: role || null,
        },
      });

      const invited = result.data?.projects?.inviteCollaborator;
      if (invited) {
        onCollaboratorInvited?.(invited);
      }

      // Reset and collapse
      setIsExpanded(false);
      setQuery('');
      setSelectedUser(null);
      setRole('');
    } catch {
      // Error handled by Apollo error state
    }
  }, [
    selectedUser,
    inviteCollaborator,
    projectId,
    role,
    onCollaboratorInvited,
  ]);

  const handleCopyInviteLink = useCallback(async () => {
    try {
      const result = await generateInviteLink({
        variables: {
          projectId,
          role: role || null,
        },
      });

      const url = result.data?.projects?.generateInviteLink;
      if (url) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), COPIED_DISPLAY_MS);
      }
    } catch {
      // Error handled by Apollo error state
    }
  }, [generateInviteLink, projectId, role]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className="text-accent font-medium text-[13px] gap-1"
      >
        <Plus className="size-3.5" />
        {isExpanded ? 'Cancel' : 'Invite'}
      </Button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Search / Selected User */}
          {!selectedUser ? (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-tertiary" />
                <input
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search builders by name or username..."
                  className="w-full bg-surface-elevated rounded-lg pl-9 pr-3 py-2 text-sm text-ink placeholder:text-ink-tertiary outline-none shadow-sm"
                />
              </div>

              {/* Search Results Dropdown */}
              {query.trim().length > 0 && filteredResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-surface-elevated rounded-lg shadow-md overflow-hidden">
                  {filteredResults
                    .slice(0, MAX_RESULTS)
                    .map((user: ProjectOwner) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-secondary transition-colors"
                      >
                        <span className="avatar avatar-xs bg-accent-subtle text-accent text-[10px] font-medium flex items-center justify-center rounded-full shrink-0">
                          {getInitials(user.displayName)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">
                            {user.displayName}
                          </p>
                          <p className="text-xs text-ink-tertiary truncate">
                            @{user.username}
                          </p>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Selected User Display */}
              <div className="flex items-center gap-3 bg-surface-elevated rounded-lg px-3 py-2.5">
                <span className="avatar avatar-xs bg-accent-subtle text-accent text-[10px] font-medium flex items-center justify-center rounded-full shrink-0">
                  {getInitials(selectedUser.displayName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">
                    {selectedUser.displayName}
                  </p>
                  <p className="text-xs text-ink-tertiary truncate">
                    @{selectedUser.username}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-xs text-ink-tertiary hover:text-ink transition-colors"
                >
                  Change
                </button>
              </div>

              {/* Role Input */}
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Role (optional)"
                className="w-full bg-surface-elevated rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-tertiary outline-none shadow-sm"
              />

              {/* Send Invite Button */}
              <Button
                onClick={handleSendInvite}
                disabled={inviting}
                size="sm"
                className="w-full"
              >
                {inviting ? 'Sending...' : 'Send Invite'}
              </Button>
            </div>
          )}

          {/* Copy Invite Link */}
          <button
            type="button"
            onClick={handleCopyInviteLink}
            disabled={generatingLink}
            className="flex items-center gap-1.5 text-accent font-medium text-[13px] hover:text-accent-hover transition-colors disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check className="size-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Link className="size-3.5" />
                {generatingLink ? 'Generating...' : 'Copy invite link'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
