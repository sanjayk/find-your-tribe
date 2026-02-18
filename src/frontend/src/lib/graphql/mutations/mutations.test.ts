import { describe, it, expect } from 'vitest';
import { type DocumentNode, print } from 'graphql';

import { SIGNUP, LOGIN, REFRESH_TOKEN, LOGOUT, COMPLETE_ONBOARDING } from './auth';
import {
  CREATE_PROJECT,
  UPDATE_PROJECT,
  DELETE_PROJECT,
  INVITE_COLLABORATOR,
  CONFIRM_COLLABORATION,
  DECLINE_COLLABORATION,
  REMOVE_COLLABORATOR,
} from './projects';
import {
  CREATE_TRIBE,
  UPDATE_TRIBE,
  ADD_OPEN_ROLE,
  REMOVE_OPEN_ROLE,
  REQUEST_TO_JOIN,
  APPROVE_MEMBER,
  REJECT_MEMBER,
  REMOVE_MEMBER,
  LEAVE_TRIBE,
} from './tribes';

/**
 * Tests that all GraphQL mutation documents are valid, parseable,
 * contain expected operation names, and request key fields.
 * Prevents accidental field deletion or document corruption during refactoring.
 */

function getOperationName(doc: DocumentNode): string | undefined {
  const opDef = doc.definitions.find((d) => d.kind === 'OperationDefinition');
  return opDef && 'name' in opDef ? opDef.name?.value : undefined;
}

describe('GraphQL mutation documents', () => {
  describe('Auth mutations', () => {
    describe('SIGNUP', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(SIGNUP)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(SIGNUP)).toBe('Signup');
      });

      it('requests auth response fields', () => {
        const printed = print(SIGNUP);
        expect(printed).toContain('accessToken');
        expect(printed).toContain('refreshToken');
        expect(printed).toContain('user');
        expect(printed).toContain('onboardingCompleted');
      });
    });

    describe('LOGIN', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(LOGIN)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(LOGIN)).toBe('Login');
      });

      it('requests auth response fields', () => {
        const printed = print(LOGIN);
        expect(printed).toContain('accessToken');
        expect(printed).toContain('refreshToken');
        expect(printed).toContain('user');
      });
    });

    describe('REFRESH_TOKEN', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(REFRESH_TOKEN)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(REFRESH_TOKEN)).toBe('RefreshToken');
      });

      it('requests token fields', () => {
        const printed = print(REFRESH_TOKEN);
        expect(printed).toContain('accessToken');
        expect(printed).toContain('refreshToken');
      });
    });

    describe('LOGOUT', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(LOGOUT)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(LOGOUT)).toBe('Logout');
      });
    });

    describe('COMPLETE_ONBOARDING', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(COMPLETE_ONBOARDING)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(COMPLETE_ONBOARDING)).toBe('CompleteOnboarding');
      });

      it('requests onboarding response fields', () => {
        const printed = print(COMPLETE_ONBOARDING);
        expect(printed).toContain('displayName');
        expect(printed).toContain('headline');
        expect(printed).toContain('primaryRole');
        expect(printed).toContain('onboardingCompleted');
      });
    });
  });

  describe('Project mutations', () => {
    describe('CREATE_PROJECT', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(CREATE_PROJECT)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(CREATE_PROJECT)).toBe('CreateProject');
      });

      it('requests project fields in response', () => {
        const printed = print(CREATE_PROJECT);
        expect(printed).toContain('title');
        expect(printed).toContain('status');
        expect(printed).toContain('techStack');
      });
    });

    describe('UPDATE_PROJECT', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(UPDATE_PROJECT)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(UPDATE_PROJECT)).toBe('UpdateProject');
      });

      it('requests updated fields in response', () => {
        const printed = print(UPDATE_PROJECT);
        expect(printed).toContain('title');
        expect(printed).toContain('updatedAt');
      });
    });

    describe('DELETE_PROJECT', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(DELETE_PROJECT)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(DELETE_PROJECT)).toBe('DeleteProject');
      });
    });

    describe('INVITE_COLLABORATOR', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(INVITE_COLLABORATOR)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(INVITE_COLLABORATOR)).toBe('InviteCollaborator');
      });
    });

    describe('CONFIRM_COLLABORATION', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(CONFIRM_COLLABORATION)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(CONFIRM_COLLABORATION)).toBe('ConfirmCollaboration');
      });
    });

    describe('DECLINE_COLLABORATION', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(DECLINE_COLLABORATION)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(DECLINE_COLLABORATION)).toBe('DeclineCollaboration');
      });
    });

    describe('REMOVE_COLLABORATOR', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(REMOVE_COLLABORATOR)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(REMOVE_COLLABORATOR)).toBe('RemoveCollaborator');
      });
    });
  });

  describe('Tribe mutations', () => {
    describe('CREATE_TRIBE', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(CREATE_TRIBE)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(CREATE_TRIBE)).toBe('CreateTribe');
      });

      it('requests tribe fields in response', () => {
        const printed = print(CREATE_TRIBE);
        expect(printed).toContain('name');
        expect(printed).toContain('mission');
        expect(printed).toContain('maxMembers');
      });
    });

    describe('UPDATE_TRIBE', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(UPDATE_TRIBE)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(UPDATE_TRIBE)).toBe('UpdateTribe');
      });
    });

    describe('ADD_OPEN_ROLE', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(ADD_OPEN_ROLE)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(ADD_OPEN_ROLE)).toBe('AddOpenRole');
      });

      it('requests role fields in response', () => {
        const printed = print(ADD_OPEN_ROLE);
        expect(printed).toContain('title');
        expect(printed).toContain('skillsNeeded');
        expect(printed).toContain('filled');
      });
    });

    describe('REMOVE_OPEN_ROLE', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(REMOVE_OPEN_ROLE)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(REMOVE_OPEN_ROLE)).toBe('RemoveOpenRole');
      });
    });

    describe('REQUEST_TO_JOIN', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(REQUEST_TO_JOIN)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(REQUEST_TO_JOIN)).toBe('RequestToJoin');
      });
    });

    describe('APPROVE_MEMBER', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(APPROVE_MEMBER)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(APPROVE_MEMBER)).toBe('ApproveMember');
      });
    });

    describe('REJECT_MEMBER', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(REJECT_MEMBER)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(REJECT_MEMBER)).toBe('RejectMember');
      });
    });

    describe('REMOVE_MEMBER', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(REMOVE_MEMBER)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(REMOVE_MEMBER)).toBe('RemoveMember');
      });
    });

    describe('LEAVE_TRIBE', () => {
      it('is a valid GraphQL document', () => {
        expect(() => print(LEAVE_TRIBE)).not.toThrow();
      });

      it('has correct operation name', () => {
        expect(getOperationName(LEAVE_TRIBE)).toBe('LeaveTribe');
      });
    });
  });

  describe('all mutations export valid DocumentNodes', () => {
    const allMutations = [
      { name: 'SIGNUP', doc: SIGNUP },
      { name: 'LOGIN', doc: LOGIN },
      { name: 'REFRESH_TOKEN', doc: REFRESH_TOKEN },
      { name: 'LOGOUT', doc: LOGOUT },
      { name: 'COMPLETE_ONBOARDING', doc: COMPLETE_ONBOARDING },
      { name: 'CREATE_PROJECT', doc: CREATE_PROJECT },
      { name: 'UPDATE_PROJECT', doc: UPDATE_PROJECT },
      { name: 'DELETE_PROJECT', doc: DELETE_PROJECT },
      { name: 'INVITE_COLLABORATOR', doc: INVITE_COLLABORATOR },
      { name: 'CONFIRM_COLLABORATION', doc: CONFIRM_COLLABORATION },
      { name: 'DECLINE_COLLABORATION', doc: DECLINE_COLLABORATION },
      { name: 'REMOVE_COLLABORATOR', doc: REMOVE_COLLABORATOR },
      { name: 'CREATE_TRIBE', doc: CREATE_TRIBE },
      { name: 'UPDATE_TRIBE', doc: UPDATE_TRIBE },
      { name: 'ADD_OPEN_ROLE', doc: ADD_OPEN_ROLE },
      { name: 'REMOVE_OPEN_ROLE', doc: REMOVE_OPEN_ROLE },
      { name: 'REQUEST_TO_JOIN', doc: REQUEST_TO_JOIN },
      { name: 'APPROVE_MEMBER', doc: APPROVE_MEMBER },
      { name: 'REJECT_MEMBER', doc: REJECT_MEMBER },
      { name: 'REMOVE_MEMBER', doc: REMOVE_MEMBER },
      { name: 'LEAVE_TRIBE', doc: LEAVE_TRIBE },
    ];

    it.each(allMutations)('$name has a definitions array', ({ doc }) => {
      expect(doc).toHaveProperty('definitions');
      expect(Array.isArray(doc.definitions)).toBe(true);
      expect(doc.definitions.length).toBeGreaterThan(0);
    });

    it.each(allMutations)('$name is a mutation operation', ({ doc }) => {
      const opDef = doc.definitions.find(
        (d: { kind: string }) => d.kind === 'OperationDefinition',
      );
      expect(opDef).toBeDefined();
      expect((opDef as { operation: string }).operation).toBe('mutation');
    });
  });
});
