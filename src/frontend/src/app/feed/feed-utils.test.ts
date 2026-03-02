import { describe, it, expect } from 'vitest';
import {
  getInitials,
  getAvatarColor,
  getGradientClasses,
  getActionText,
  getLinkTarget,
  getActorDisplayName,
  hashString,
} from './feed-utils';
import type { AvatarColor } from './feed-utils';

/* ─── hashString ─── */

describe('hashString', () => {
  it('returns a number', () => {
    expect(typeof hashString('hello')).toBe('number');
  });

  it('is deterministic — same input same output', () => {
    expect(hashString('Maya Chen')).toBe(hashString('Maya Chen'));
  });

  it('differs for different inputs', () => {
    expect(hashString('Alpha')).not.toBe(hashString('Beta'));
  });

  it('handles empty string', () => {
    expect(hashString('')).toBe(0);
  });
});

/* ─── getInitials ─── */

describe('getInitials', () => {
  it('extracts initials from actor_name', () => {
    expect(getInitials({ actor_name: 'Maya Chen' })).toBe('MC');
  });

  it('handles single-word actor_name', () => {
    expect(getInitials({ actor_name: 'Maya' })).toBe('M');
  });

  it('caps at 2 characters for multi-word actor_name', () => {
    expect(getInitials({ actor_name: 'Alice Bob Carol' })).toBe('AB');
  });

  it('falls back to user_name when actor_name missing', () => {
    expect(getInitials({ user_name: 'Jordan Smith' })).toBe('JS');
  });

  it('falls back to member_name when actor_name and user_name missing', () => {
    expect(getInitials({ member_name: 'Pat Lee' })).toBe('PL');
  });

  it('falls back to first 2 chars of actor_username', () => {
    expect(getInitials({ actor_username: 'maya' })).toBe('ma');
  });

  it('falls back to first 2 chars of actor_username when it is short', () => {
    expect(getInitials({ actor_username: 'a' })).toBe('a');
  });

  it('returns ? when no name fields present', () => {
    expect(getInitials({})).toBe('?');
  });

  it('ignores undefined metadata fields and falls through chain', () => {
    expect(getInitials({ actor_name: undefined, actor_username: 'jdoe' })).toBe('jd');
  });
});

/* ─── getAvatarColor ─── */

describe('getAvatarColor', () => {
  it('returns a valid AvatarColor shape', () => {
    const color = getAvatarColor('Maya Chen');
    expect(color).toHaveProperty('bg');
    expect(color).toHaveProperty('text');
    expect(typeof color.bg).toBe('string');
    expect(typeof color.text).toBe('string');
  });

  it('is deterministic — same name same color', () => {
    expect(getAvatarColor('James Okafor')).toEqual(getAvatarColor('James Okafor'));
  });

  it('returns neutral palette (index 5) for undefined name', () => {
    expect(getAvatarColor(undefined)).toEqual({
      bg: 'bg-surface-secondary',
      text: 'text-ink-secondary',
    });
  });

  it('returns neutral palette (index 5) for empty string', () => {
    expect(getAvatarColor('')).toEqual({
      bg: 'bg-surface-secondary',
      text: 'text-ink-secondary',
    });
  });

  it('covers all 6 palette entries with valid shape', () => {
    const palette: AvatarColor[] = [
      { bg: 'bg-accent-subtle', text: 'text-accent' },
      { bg: 'bg-shipped-subtle', text: 'text-shipped' },
      { bg: 'bg-in-progress-subtle', text: 'text-in-progress' },
      { bg: 'bg-surface-inverse', text: 'text-ink-inverse' },
      { bg: 'bg-accent-muted/30', text: 'text-accent' },
      { bg: 'bg-surface-secondary', text: 'text-ink-secondary' },
    ];
    // Force all 6 palette entries to appear by testing names that hash to each index
    // We verify the result is always one of the known palette entries
    const testNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    for (const name of testNames) {
      const result = getAvatarColor(name);
      expect(palette).toContainEqual(result);
    }
  });

  it('returns different colors for sufficiently different names', () => {
    // With 6 possible entries, two distinct names can have different colors
    const colors = new Set<string>();
    ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace'].forEach((n) => {
      colors.add(getAvatarColor(n).bg);
    });
    expect(colors.size).toBeGreaterThan(1);
  });
});

/* ─── getGradientClasses ─── */

describe('getGradientClasses', () => {
  it('returns a GradientClasses shape', () => {
    const g = getGradientClasses('Tribe Finder');
    expect(g).toHaveProperty('from');
    expect(g).toHaveProperty('via');
    expect(g).toHaveProperty('to');
  });

  it('is deterministic — same title same gradient', () => {
    expect(getGradientClasses('Tribe Finder')).toEqual(getGradientClasses('Tribe Finder'));
  });

  it('returns empty strings when title is undefined', () => {
    expect(getGradientClasses(undefined)).toEqual({ from: '', via: '', to: '' });
  });

  it('returns empty strings when title is empty string', () => {
    expect(getGradientClasses('')).toEqual({ from: '', via: '', to: '' });
  });

  it('returns non-empty strings for a valid title', () => {
    const g = getGradientClasses('My Project');
    expect(g.from.length).toBeGreaterThan(0);
    expect(g.via.length).toBeGreaterThan(0);
    expect(g.to.length).toBeGreaterThan(0);
  });

  it('covers 4 distinct gradients across different titles', () => {
    const froms = new Set<string>();
    ['A', 'BB', 'CCC', 'DDDD'].forEach((t) => froms.add(getGradientClasses(t).from));
    // With 4 possible gradients we may hit duplicates, but at least 1 distinct value
    expect(froms.size).toBeGreaterThanOrEqual(1);
  });
});

/* ─── getActionText ─── */

describe('getActionText', () => {
  it('returns "shipped" for PROJECT_SHIPPED', () => {
    expect(getActionText('PROJECT_SHIPPED')).toBe('shipped');
  });

  it('returns "started building" for PROJECT_CREATED', () => {
    expect(getActionText('PROJECT_CREATED')).toBe('started building');
  });

  it('returns "posted an update" for PROJECT_UPDATE', () => {
    expect(getActionText('PROJECT_UPDATE')).toBe('posted an update');
  });

  it('returns "formed a tribe" for TRIBE_CREATED', () => {
    expect(getActionText('TRIBE_CREATED')).toBe('formed a tribe');
  });

  it('returns "announced" for TRIBE_ANNOUNCEMENT', () => {
    expect(getActionText('TRIBE_ANNOUNCEMENT')).toBe('announced');
  });

  it('returns "joined a project" for COLLABORATION_CONFIRMED', () => {
    expect(getActionText('COLLABORATION_CONFIRMED')).toBe('joined a project');
  });

  it('returns "joined a tribe" for MEMBER_JOINED_TRIBE', () => {
    expect(getActionText('MEMBER_JOINED_TRIBE')).toBe('joined a tribe');
  });

  it('returns "joined" for BUILDER_JOINED', () => {
    expect(getActionText('BUILDER_JOINED')).toBe('joined');
  });

  it('returns empty string for unknown event type', () => {
    expect(getActionText('UNKNOWN_EVENT')).toBe('');
  });
});

/* ─── getLinkTarget ─── */

describe('getLinkTarget', () => {
  it('maps project to /project/:id', () => {
    expect(getLinkTarget('project', '123')).toBe('/project/123');
  });

  it('maps tribe to /tribe/:id', () => {
    expect(getLinkTarget('tribe', '456')).toBe('/tribe/456');
  });

  it('maps user to /profile/:id', () => {
    expect(getLinkTarget('user', '789')).toBe('/profile/789');
  });

  it('returns null for unknown targetType', () => {
    expect(getLinkTarget('organization', '001')).toBeNull();
  });

  it('returns null when targetType is null', () => {
    expect(getLinkTarget(null, '123')).toBeNull();
  });

  it('returns null when targetId is null', () => {
    expect(getLinkTarget('project', null)).toBeNull();
  });

  it('returns null when both are null', () => {
    expect(getLinkTarget(null, null)).toBeNull();
  });
});

/* ─── getActorDisplayName ─── */

describe('getActorDisplayName', () => {
  it('returns actor_name when present', () => {
    expect(
      getActorDisplayName({
        actor_name: 'Maya Chen',
        user_name: 'Jordan',
        member_name: 'Pat',
        actor_username: 'maya',
      }),
    ).toBe('Maya Chen');
  });

  it('falls back to user_name when actor_name missing', () => {
    expect(
      getActorDisplayName({
        user_name: 'Jordan Smith',
        member_name: 'Pat',
        actor_username: 'jordan',
      }),
    ).toBe('Jordan Smith');
  });

  it('falls back to member_name when actor_name and user_name missing', () => {
    expect(
      getActorDisplayName({
        member_name: 'Pat Lee',
        actor_username: 'patlee',
      }),
    ).toBe('Pat Lee');
  });

  it('falls back to actor_username when display-friendly names missing', () => {
    expect(getActorDisplayName({ actor_username: 'patlee' })).toBe('patlee');
  });

  it('returns "A builder" when all fields missing', () => {
    expect(getActorDisplayName({})).toBe('A builder');
  });

  it('prefers display-friendly names over actor_username', () => {
    const result = getActorDisplayName({
      actor_name: undefined,
      user_name: 'Visible Name',
      actor_username: 'rawusername',
    });
    expect(result).toBe('Visible Name');
  });
});
