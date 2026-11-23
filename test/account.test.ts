import { describe, expect, it } from 'vitest';
import {
  assignMemberRole,
  canRemoveMember,
  createInitialAccountState,
  inviteMember,
  passwordStrength,
  resendInvite,
  revokeInvite,
  transferOwnership,
  validateSignIn,
  validateSignUp,
} from '../src/lib/account';

describe('account domain', () => {
  it('blocks duplicate email sign-up and points to sign-in', () => {
    const state = createInitialAccountState();
    const res = validateSignUp(state, {
      name: 'Marcus Tan',
      email: 'marcus.tan@nusantara-sg.com',
      password: 'Password1!',
      acceptedTerms: true,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.field).toBe('email');
      expect(res.existingAccount).toBe(true);
    }
  });

  it('uses generic error for sign-in mismatches to avoid account enumeration', () => {
    const state = createInitialAccountState();
    const wrongEmail = validateSignIn(state, 'unknown@example.com', 'Password1!');
    const wrongPass = validateSignIn(state, 'dewi.anggraini@nusantara-holding.com', '123');
    expect(wrongEmail).toEqual(wrongPass);
    expect(wrongEmail.ok).toBe(false);
  });

  it('scores password strength cleanly', () => {
    expect(passwordStrength('').score).toBe(0);
    expect(passwordStrength('Abcdef1!ghij').score).toBe(4);
  });

  it('prevents removing the workspace owner until ownership is transferred', () => {
    const state = createInitialAccountState();
    const owner = state.members.find((m) => m.isOwner)!;
    const ceo = state.members.find((m) => m.id === 'MEM-CEO')!;
    expect(canRemoveMember(state.members, owner.id).ok).toBe(false);

    const transferred = transferOwnership(state, ceo.id);
    expect(canRemoveMember(transferred.members, owner.id).ok).toBe(true);
    expect(canRemoveMember(transferred.members, ceo.id).ok).toBe(false);
  });

  it('assigns a role to a waiting member and updates status', () => {
    const state = createInitialAccountState();
    const next = assignMemberRole(state, 'MEM-WAIT', 'controller_us');
    const updated = next.members.find((m) => m.id === 'MEM-WAIT')!;
    expect(updated.roleId).toBe('controller_us');
    expect(updated.status).toBe('active');
  });

  it('supports inviting, resending, and revoking invites', () => {
    const state = createInitialAccountState();
    const invited = inviteMember(state, 'new.tax@nusantara-holding.com', 'director_sg', 'Dewi');
    expect(invited.error).toBeUndefined();
    const inv = invited.next.invites[0];
    expect(inv.email).toBe('new.tax@nusantara-holding.com');

    const resent = resendInvite({ ...invited.next, invites: [{ ...inv, expired: true }] }, inv.id);
    expect(resent.invites[0].expired).toBe(false);

    const revoked = revokeInvite(resent, inv.id);
    expect(revoked.invites.some((i) => i.id === inv.id)).toBe(false);
  });
});
