import { describe, expect, it } from 'vitest';
import { SAMPLE_ENTITIES } from '../src/data/entities';
import {
  computeOwnershipChain,
  computeSignatoryPlan,
  createInitialOwnershipState,
  remainingOwnership,
  rolesForProfile,
  wouldCreateCycle,
} from '../src/lib/ownershipChain';

describe('ownershipChain engine', () => {
  it('multiplies effective ownership along paths and sums multi-path individuals', () => {
    const state = createInitialOwnershipState(SAMPLE_ENTITIES);
    const idEntity = SAMPLE_ENTITIES[0];
    const chain = computeOwnershipChain(state, idEntity);

    // Hendra: (45% * 70% = 31.5%) + (20% * 80% * 100% = 16.0%) = 47.5%
    const hendra = chain.individuals.find((i) => i.profileId === 'PTY-IND-HENDRA');
    expect(hendra?.effectivePercent).toBe(47.5);
    expect(hendra?.isUbo).toBe(true);
    expect(hendra?.paths.length).toBe(2);

    // Kartika: (45% * 30% = 13.5%) + (35% * 45% = 15.75%) = 29.25%
    const kartika = chain.individuals.find((i) => i.profileId === 'PTY-IND-KARTIKA');
    expect(kartika?.effectivePercent).toBe(29.25);
    expect(kartika?.isUbo).toBe(true);

    // Marcus: 35% * 55% * 100% = 19.25% (below 25% threshold)
    const marcus = chain.individuals.find((i) => i.profileId === 'PTY-IND-MARCUS');
    expect(marcus?.effectivePercent).toBe(19.25);
    expect(marcus?.isUbo).toBe(false);

    // Pacific Horizon Feeder Ltd. has no recorded owners -> 20% * 20% = 4.0% untraced
    expect(chain.tracedPercent).toBe(96);
    expect(chain.untracedPercent).toBe(4);
    expect(chain.untracedLeaves).toHaveLength(1);
    expect(chain.untracedLeaves[0].companyId).toBe('PTY-CORP-FEEDER');
  });

  it('blocks ownership loops / cycles across arbitrary depth', () => {
    const state = createInitialOwnershipState(SAMPLE_ENTITIES);
    // BlueHorizon owns ENT-ID-001, Pacific Coast GP owns BlueHorizon.
    // Trying to link BlueHorizon as owner of Pacific Coast GP creates a cycle.
    expect(wouldCreateCycle(state.links, 'PTY-CORP-PACIFICGP', 'PTY-CORP-BLUEHORIZON')).toBe(true);
    expect(wouldCreateCycle(state.links, 'PTY-CORP-PACIFICGP', 'PTY-CORP-PACIFICGP')).toBe(true);
    expect(wouldCreateCycle(state.links, 'PTY-CORP-FEEDER', 'PTY-IND-MARCUS')).toBe(false);
  });

  it('computes remaining unrecorded ownership percentage accurately', () => {
    const state = createInitialOwnershipState(SAMPLE_ENTITIES);
    expect(remainingOwnership(state.links, 'ENT-ID-001')).toBe(0);
    expect(remainingOwnership(state.links, 'PTY-CORP-FEEDER')).toBe(100);
  });

  it('derives signatory plan and blocks sending when corporate/intermediate directors are missing', () => {
    const state = createInitialOwnershipState(SAMPLE_ENTITIES);
    const idEntity = SAMPLE_ENTITIES[0];
    const plan = computeSignatoryPlan(state, idEntity);

    // BlueHorizon (D9 + D100) and Pacific Horizon Feeder (D9) lack directors -> 3 missing
    expect(plan.blocked).toBe(true);
    expect(plan.missingCount).toBe(3);
    expect(plan.missingEntities.map((e) => e.id).sort()).toEqual(['PTY-CORP-BLUEHORIZON', 'PTY-CORP-FEEDER']);

    // Adding directors unblocks the plan
    const fixed = {
      ...state,
      profiles: state.profiles.map((p) =>
        p.id === 'PTY-CORP-BLUEHORIZON' || p.id === 'PTY-CORP-FEEDER'
          ? { ...p, directorIds: ['PTY-IND-SARAH'] }
          : p,
      ),
    };
    const readyPlan = computeSignatoryPlan(fixed, idEntity);
    expect(readyPlan.blocked).toBe(false);
    expect(readyPlan.missingCount).toBe(0);
  });

  it('tracks multiple roles per reusable profile', () => {
    const state = createInitialOwnershipState(SAMPLE_ENTITIES);
    const roles = rolesForProfile(state, SAMPLE_ENTITIES, 'PTY-IND-MARCUS');
    expect(roles.length).toBeGreaterThanOrEqual(3);
    expect(roles.some((r) => r.role === 'Direktur')).toBe(true);
    expect(roles.some((r) => r.role === 'Pemegang saham perantara')).toBe(true);
  });
});
