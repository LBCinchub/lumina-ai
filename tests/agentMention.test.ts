import { test, expect } from 'vitest';
import { matchAgentMention } from '../base44/shared/agentMention.ts';

const agents = [{ id: 'a1', name: 'Scout' }, { id: 'a2', name: 'Scout Pro' }, { id: 'a3', name: 'Old', status: 'archived' }];

test('matches longest owned agent name and strips it from the goal', () => {
  expect(matchAgentMention('@Scout Pro research EV prices', agents)).toEqual({ agent: agents[1], goal: 'research EV prices' });
  expect(matchAgentMention('hey @scout, compare CRMs', agents)?.agent.id).toBe('a1');
});

test('ignores emails, partial names, archived and unknown agents', () => {
  expect(matchAgentMention('mail me@Scout.com', agents)).toBeNull();
  expect(matchAgentMention('@Scouting trip', agents)).toBeNull();
  expect(matchAgentMention('@Old do it', agents)).toBeNull();
  expect(matchAgentMention('@Nobody do it', agents)).toBeNull();
});