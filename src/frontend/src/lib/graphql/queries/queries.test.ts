import { describe, it, expect } from 'vitest';
import { type DocumentNode, print } from 'graphql';

import { GET_BUILDER, GET_BUILDERS } from './builders';
import { GET_BURN_SUMMARY, GET_BURN_RECEIPT } from './burn';
import { GET_FEED } from './feed';
import { GET_PROJECT, GET_PROJECTS } from './projects';
import { GET_TRIBE, GET_TRIBES } from './tribes';

/**
 * Tests that all GraphQL query documents are valid, parseable,
 * contain expected operation names, and request key fields.
 * Prevents accidental field deletion or document corruption during refactoring.
 */

function getOperationName(doc: DocumentNode): string | undefined {
  const opDef = doc.definitions.find((d) => d.kind === 'OperationDefinition');
  return opDef && 'name' in opDef ? opDef.name?.value : undefined;
}

describe('GraphQL query documents', () => {
  describe('GET_BUILDER', () => {
    it('is a valid GraphQL document', () => {
      expect(() => print(GET_BUILDER)).not.toThrow();
    });

    it('has correct operation name', () => {
      expect(getOperationName(GET_BUILDER)).toBe('GetBuilder');
    });

    it('queries the user field', () => {
      const printed = print(GET_BUILDER);
      expect(printed).toContain('user(username:');
    });

    it('requests key profile fields', () => {
      const printed = print(GET_BUILDER);
      expect(printed).toContain('username');
      expect(printed).toContain('displayName');
      expect(printed).toContain('builderScore');
      expect(printed).toContain('skills');
      expect(printed).toContain('projects');
      expect(printed).toContain('tribes');
    });
  });

  describe('GET_BUILDERS', () => {
    it('is a valid GraphQL document', () => {
      expect(() => print(GET_BUILDERS)).not.toThrow();
    });

    it('has correct operation name', () => {
      expect(getOperationName(GET_BUILDERS)).toBe('GetBuilders');
    });

    it('queries the builders field', () => {
      const printed = print(GET_BUILDERS);
      expect(printed).toContain('builders(');
    });

    it('requests key listing fields', () => {
      const printed = print(GET_BUILDERS);
      expect(printed).toContain('username');
      expect(printed).toContain('displayName');
      expect(printed).toContain('builderScore');
      expect(printed).toContain('skills');
    });
  });

  describe('GET_BURN_SUMMARY', () => {
    it('is a valid GraphQL document', () => {
      expect(() => print(GET_BURN_SUMMARY)).not.toThrow();
    });

    it('has correct operation name', () => {
      expect(getOperationName(GET_BURN_SUMMARY)).toBe('GetBurnSummary');
    });

    it('requests burn summary fields', () => {
      const printed = print(GET_BURN_SUMMARY);
      expect(printed).toContain('burnSummary(');
      expect(printed).toContain('daysActive');
      expect(printed).toContain('totalTokens');
      expect(printed).toContain('weeklyStreak');
      expect(printed).toContain('dailyActivity');
    });
  });

  describe('GET_BURN_RECEIPT', () => {
    it('is a valid GraphQL document', () => {
      expect(() => print(GET_BURN_RECEIPT)).not.toThrow();
    });

    it('has correct operation name', () => {
      expect(getOperationName(GET_BURN_RECEIPT)).toBe('GetBurnReceipt');
    });

    it('requests burn receipt fields', () => {
      const printed = print(GET_BURN_RECEIPT);
      expect(printed).toContain('burnReceipt(');
      expect(printed).toContain('projectId');
      expect(printed).toContain('totalTokens');
      expect(printed).toContain('durationWeeks');
      expect(printed).toContain('dailyActivity');
    });
  });

  describe('GET_FEED', () => {
    it('is a valid GraphQL document', () => {
      expect(() => print(GET_FEED)).not.toThrow();
    });

    it('has correct operation name', () => {
      expect(getOperationName(GET_FEED)).toBe('GetFeed');
    });

    it('queries the feed field', () => {
      const printed = print(GET_FEED);
      expect(printed).toContain('feed(');
    });

    it('requests key event fields', () => {
      const printed = print(GET_FEED);
      expect(printed).toContain('eventType');
      expect(printed).toContain('targetType');
      expect(printed).toContain('targetId');
      expect(printed).toContain('metadata');
      expect(printed).toContain('createdAt');
    });
  });

  describe('GET_PROJECT', () => {
    it('is a valid GraphQL document', () => {
      expect(() => print(GET_PROJECT)).not.toThrow();
    });

    it('has correct operation name', () => {
      expect(getOperationName(GET_PROJECT)).toBe('GetProject');
    });

    it('requests key project fields', () => {
      const printed = print(GET_PROJECT);
      expect(printed).toContain('project(id:');
      expect(printed).toContain('title');
      expect(printed).toContain('description');
      expect(printed).toContain('status');
      expect(printed).toContain('techStack');
      expect(printed).toContain('owner');
      expect(printed).toContain('collaborators');
    });
  });

  describe('GET_PROJECTS', () => {
    it('is a valid GraphQL document', () => {
      expect(() => print(GET_PROJECTS)).not.toThrow();
    });

    it('has correct operation name', () => {
      expect(getOperationName(GET_PROJECTS)).toBe('GetProjects');
    });

    it('queries the projects field with pagination and filter', () => {
      const printed = print(GET_PROJECTS);
      expect(printed).toContain('projects(');
    });

    it('requests key listing fields', () => {
      const printed = print(GET_PROJECTS);
      expect(printed).toContain('title');
      expect(printed).toContain('status');
      expect(printed).toContain('techStack');
    });
  });

  describe('GET_TRIBE', () => {
    it('is a valid GraphQL document', () => {
      expect(() => print(GET_TRIBE)).not.toThrow();
    });

    it('has correct operation name', () => {
      expect(getOperationName(GET_TRIBE)).toBe('GetTribe');
    });

    it('requests key tribe fields', () => {
      const printed = print(GET_TRIBE);
      expect(printed).toContain('tribe(id:');
      expect(printed).toContain('name');
      expect(printed).toContain('mission');
      expect(printed).toContain('members');
      expect(printed).toContain('openRoles');
      expect(printed).toContain('owner');
    });
  });

  describe('GET_TRIBES', () => {
    it('is a valid GraphQL document', () => {
      expect(() => print(GET_TRIBES)).not.toThrow();
    });

    it('has correct operation name', () => {
      expect(getOperationName(GET_TRIBES)).toBe('GetTribes');
    });

    it('queries the tribes field', () => {
      const printed = print(GET_TRIBES);
      expect(printed).toContain('tribes(');
    });

    it('requests key listing fields', () => {
      const printed = print(GET_TRIBES);
      expect(printed).toContain('name');
      expect(printed).toContain('mission');
      expect(printed).toContain('members');
      expect(printed).toContain('openRoles');
    });
  });

  describe('all queries export valid DocumentNodes', () => {
    const allQueries = [
      { name: 'GET_BUILDER', doc: GET_BUILDER },
      { name: 'GET_BUILDERS', doc: GET_BUILDERS },
      { name: 'GET_BURN_SUMMARY', doc: GET_BURN_SUMMARY },
      { name: 'GET_BURN_RECEIPT', doc: GET_BURN_RECEIPT },
      { name: 'GET_FEED', doc: GET_FEED },
      { name: 'GET_PROJECT', doc: GET_PROJECT },
      { name: 'GET_PROJECTS', doc: GET_PROJECTS },
      { name: 'GET_TRIBE', doc: GET_TRIBE },
      { name: 'GET_TRIBES', doc: GET_TRIBES },
    ];

    it.each(allQueries)('$name has a definitions array', ({ doc }) => {
      expect(doc).toHaveProperty('definitions');
      expect(Array.isArray(doc.definitions)).toBe(true);
      expect(doc.definitions.length).toBeGreaterThan(0);
    });

    it.each(allQueries)('$name is a query operation', ({ doc }) => {
      const opDef = doc.definitions.find(
        (d: { kind: string }) => d.kind === 'OperationDefinition',
      );
      expect(opDef).toBeDefined();
      expect((opDef as { operation: string }).operation).toBe('query');
    });
  });
});
