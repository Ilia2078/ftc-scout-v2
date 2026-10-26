import test from 'node:test';
import assert from 'node:assert/strict';
import { adjustCounters } from '../counter-rules.js';

test('hit + increases both hit and artifact counters', () => {
  assert.deepEqual(adjustCounters(5,3,'hits',1), {artifacts:6,hits:4});
});
test('hit - preserves artifacts', () => {
  assert.deepEqual(adjustCounters(5,3,'hits',-1), {artifacts:5,hits:2});
});
test('artifact cannot be decremented below hits', () => {
  assert.deepEqual(adjustCounters(5,5,'artifacts',-1), {artifacts:5,hits:5});
  assert.deepEqual(adjustCounters(6,5,'artifacts',-1), {artifacts:5,hits:5});
});
test('artifact + does not change hits', () => {
  assert.deepEqual(adjustCounters(5,3,'artifacts',1), {artifacts:6,hits:3});
});
test('counters stay within 0..1000', () => {
  assert.deepEqual(adjustCounters(0,0,'hits',-1), {artifacts:0,hits:0});
  assert.deepEqual(adjustCounters(1000,4,'hits',1), {artifacts:1000,hits:4});
});
