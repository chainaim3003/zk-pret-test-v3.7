/**
 * Test script to verify that our fixes compile correctly
 */

import { Field } from 'o1js';
import { ComposedOptimCompliance } from '../src/tests/with-sign/ComposedRecursiveOptim3LevelZKProgramWithSign.js';

console.log('🧪 Testing TypeScript compilation fixes...');

// Test that Field type works correctly
const testTimestamp = Field.from(Date.now());
console.log('✅ Field timestamp creation works:', testTimestamp.toString());

// Test that the ZK program imports correctly
console.log('✅ ComposedOptimCompliance program imported successfully');
console.log('✅ Program name:', ComposedOptimCompliance.name);

console.log('🎉 All fixes appear to compile correctly!');
