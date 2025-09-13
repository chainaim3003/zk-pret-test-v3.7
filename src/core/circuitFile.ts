
// Command used: '\S.*\S' '--functionName' 'fun0' '--filePath' './src/circuitFile.ts'
import { Bool, Field, UInt8 } from 'o1js';

export function fun0(input: UInt8[]) {
	const num_bytes = input.length;
	let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);
	let state_changed: Bool[] = Array.from({ length: num_bytes }, () => Bool(false));
	
	states[0][0] = Bool(true);
	for (let i = 1; i < 3; i++) {
		states[0][i] = Bool(false);
	}
	
	for (let i = 0; i < num_bytes; i++) {
		const eq0 = input[i].value.equals(9);
		const eq1 = input[i].value.equals(10);
		const eq2 = input[i].value.equals(11);
		const eq3 = input[i].value.equals(12);
		const eq4 = input[i].value.equals(13);
		let multi_or0 = Bool(false);
		multi_or0 = multi_or0.or(eq0);
		multi_or0 = multi_or0.or(eq1);
		multi_or0 = multi_or0.or(eq2);
		multi_or0 = multi_or0.or(eq3);
		multi_or0 = multi_or0.or(eq4);
		const and0 = states[i][0].and(multi_or0.not());
		const eq5 = input[i].value.equals(46);
		const and1 = states[i][1].and(eq5);
		let multi_or1 = Bool(false);
		multi_or1 = multi_or1.or(and0);
		multi_or1 = multi_or1.or(and1);
		states[i+1][1] = multi_or1;
		state_changed[i] = state_changed[i].or(states[i+1][1]);
		let multi_or2 = Bool(false);
		multi_or2 = multi_or2.or(eq0);
		multi_or2 = multi_or2.or(eq1);
		multi_or2 = multi_or2.or(eq2);
		multi_or2 = multi_or2.or(eq3);
		multi_or2 = multi_or2.or(eq4);
		multi_or2 = multi_or2.or(eq5);
		const and2 = states[i][1].and(multi_or2.not());
		states[i+1][2] = and2;
		state_changed[i] = state_changed[i].or(states[i+1][2]);
		states[i+1][0] = state_changed[i].not();
	}
	
	let final_state_result = Bool(false);
	for (let i = 0; i <= num_bytes; i++) {
		final_state_result = final_state_result.or(states[i][2]);
	}
	const out = final_state_result;

	return out;
}

// Command used: '[A-Z]{2}' '--functionName' 'fun1' '--filePath' './src/circuitFile.ts'
export function fun1(input: UInt8[]) {
	const num_bytes = input.length;
	let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);
	let state_changed: Bool[] = Array.from({ length: num_bytes }, () => Bool(false));
	
	states[0][0] = Bool(true);
	for (let i = 1; i < 3; i++) {
		states[0][i] = Bool(false);
	}
	
	for (let i = 0; i < num_bytes; i++) {
		const lt0 = new UInt8(65).lessThanOrEqual(input[i]);
		const lt1 = input[i].lessThanOrEqual(90);
		const and0 = lt0.and(lt1);
		const and1 = states[i][0].and(and0);
		states[i+1][1] = and1;
		state_changed[i] = state_changed[i].or(states[i+1][1]);
		const and2 = states[i][1].and(and0);
		states[i+1][2] = and2;
		state_changed[i] = state_changed[i].or(states[i+1][2]);
		states[i+1][0] = state_changed[i].not();
	}
	
	let final_state_result = Bool(false);
	for (let i = 0; i <= num_bytes; i++) {
		final_state_result = final_state_result.or(states[i][2]);
	}
	const out = final_state_result;

	return out;
}

// Command used: '\S+' '--functionName' 'fun2' '--filePath' './src/circuitFile.ts'
export function fun2(input: UInt8[]) {
	const num_bytes = input.length;
	let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);
	let state_changed: Bool[] = Array.from({ length: num_bytes }, () => Bool(false));
	
	states[0][0] = Bool(true);
	for (let i = 1; i < 2; i++) {
		states[0][i] = Bool(false);
	}
	
	for (let i = 0; i < num_bytes; i++) {
		const eq0 = input[i].value.equals(9);
		const eq1 = input[i].value.equals(10);
		const eq2 = input[i].value.equals(11);
		const eq3 = input[i].value.equals(12);
		const eq4 = input[i].value.equals(13);
		let multi_or0 = Bool(false);
		multi_or0 = multi_or0.or(eq0);
		multi_or0 = multi_or0.or(eq1);
		multi_or0 = multi_or0.or(eq2);
		multi_or0 = multi_or0.or(eq3);
		multi_or0 = multi_or0.or(eq4);
		const and0 = states[i][0].and(multi_or0.not());
		const and1 = states[i][1].and(multi_or0.not());
		let multi_or1 = Bool(false);
		multi_or1 = multi_or1.or(and0);
		multi_or1 = multi_or1.or(and1);
		states[i+1][1] = multi_or1;
		state_changed[i] = state_changed[i].or(states[i+1][1]);
		states[i+1][0] = state_changed[i].not();
	}
	
	let final_state_result = Bool(true);
	for (let i = 1; i <= num_bytes; i++) {
		final_state_result = final_state_result.and(states[i][1]);
	}
	const out = final_state_result;

	return out;
}
