import { exec } from 'child_process';
import * as fs from 'fs'; 
import { promisify } from 'util'; 
import {Bool,Bytes,method, CircuitString} from 'o1js';
import {fun0,fun1,fun2} from './circuitFile.js'

class Bytes50 extends Bytes(50){}

const execPromise = promisify(exec);
interface NestedObject {
    properties?: { [key: string]: NestedObject };
    required?: string[];
    type: string;
}

interface patternObject {
    type: string;
    pattern?: string;
    enum?: string[];
}

interface RequiredKeysObject {
    [key: string]: RequiredKeysObject | patternObject;
}
  
let dict: { [key: string]: string } = {}; 

export function isPatternObject(obj: any): obj is patternObject { 
    return obj && typeof obj.type === 'string'; 
}

async function verifySchema(requiredKeys: RequiredKeysObject, dict: { [key: string]: string }, exampleJson: any): Promise<boolean> {
    for (const key in requiredKeys) {
        const value = requiredKeys[key];
        if (!(key in exampleJson)) { 
            console.error(`Key not found: ${key}`); 
            return false;
        } 
        if (!isPatternObject(value)) { 
            const result = await verifySchema(value as RequiredKeysObject, dict, exampleJson[key]);
            if (!result) return false;
        } else { 
            if (value.type == "array") {
                if (!Array.isArray(exampleJson[key])) {
                    console.error(`Type mismatch for key: ${key}`); 
                    console.error(`Type mismatch for key: ${typeof exampleJson[key]}`); 
                    return false;
                } else {
                    console.log(`array type verification successful for ${key}`)
                }
            } else if (value.type && typeof exampleJson[key] !== value.type) { 
                console.error(`Type mismatch for key: ${key}`); 
                console.error(`Type mismatch for key: ${typeof exampleJson[key]}`); 
                console.error(`Type mismatch for key: ${exampleJson[key]}`); 
                return false;
            } else {
                console.log(`${value.type} type verification successful for ${key}`);
            }
            
            if (value.pattern) {
                let pat = value.pattern;
                if (pat === '^\S(?:.*\S)?$' || pat === '^\\S(?:.*\\S)?$')  {
                    pat = '^\\S.*\\S$';
                }     
                let newPat = pat.replace(/^\^/, '').replace(/\$$/, '');  
                const functionName = dict[newPat];
                console.log(key);
                console.log(newPat);
                console.log(functionName);

                // IMPORTANT Call to ZKRegEx

                const patternResult = await regexVerify(Bytes50.fromString(`${exampleJson[key]}`), `${functionName}`);


                if (!patternResult) return false;
                console.log(`pattern verification completed`)
            }
            
            if (value.enum) { 
                if (!value.enum.includes(exampleJson[key])) {
                    console.error(`Enum value mismatch for key: ${key}`); 
                    return false;
                } else {
                    console.log(`enum value verification successful for ${key}`);
                }
            }
        }
    }
    return true;
}

async function regexVerify(str: Bytes50, functionName: string): Promise<boolean> {
    const functionMap: { [key: string]: Function } = {
        "fun0": fun0,
        "fun1": fun1,
        "fun2": fun2
    };
  
    const fun = functionMap[functionName]; 
    if (!fun) {
        throw new Error(`Function ${functionName} not found in functionMap.`);
    } 
    let out = fun(str.bytes);
    console.log(`output from regexVerify: ${out}`);
    return out;
}

export async function verifyActual(): Promise<void> {
    try {
        const data = await fs.promises.readFile('src/core/data.json', 'utf8');
        const jsonData = JSON.parse(data);
        const requiredKeys = jsonData.requiredKeys;
        const d = jsonData.d;
        console.log('requiredKeys:', requiredKeys);
        console.log('d:', d);
        
        const evalBLJson = JSON.parse(await fs.promises.readFile('actualBL1.json', 'utf8'));

        const result = await verifySchema(requiredKeys, d, evalBLJson);
        if (result) {
            console.log("Schema verification completed successfully.");
        } else {
            console.log("Schema verification failed.");
        }
    } catch (err) {
        console.error('Error:', err);
    }
}


export async function verifyActualFromFile(filename: string): Promise<any> {
	
    try {

        const data = await fs.promises.readFile('src/core/data.json', 'utf8');
        const jsonData = JSON.parse(data);
        const requiredKeys = jsonData.requiredKeys;
        const d = jsonData.d;
        //console.log('requiredKeys:', requiredKeys);
        //console.log('d:', d);             
        
        const evalBLJson = JSON.parse(await fs.promises.readFile(filename, 'utf8'));

       ///console.log(" eval BL Json in verify Actual from file ...")
        //console.log(evalBLJson)

        const out = await verifySchema(requiredKeys, d, evalBLJson);

        //console.log("out ...........&&&&&&&&&&   verifyActualFromFile...  ", out )

        if (out) {
            console.log("Schema verification completed successfully.");
        } else {
            console.log("Schema verification failed.");
        }

        return out;

    } catch (err) {
        console.error('Error:', err);
    }
}

export async function verifyActualFromJSONString(jsonString: string): Promise<any> {
//export function verifyProcess(input: UInt8[]) {
//export function verifyActualFromJSONString(jsonString: string) {
    try {

        console.log("data file parsed... ");

        let out = Bool(true);
        const data = await fs.promises.readFile('src/core/data.json', 'utf8');
        const jsonData = JSON.parse(data);

       // console.log("jsonData... ",jsonData);

        const requiredKeys = jsonData.requiredKeys;
        const d = jsonData.d;
        console.log('requiredKeys:', requiredKeys);
        console.log('d:', d);
        
        const jsonContent = JSON.parse(jsonString);
        //const result = await verifySchema(requiredKeys, d, jsonContent);
        //let result = Bool(true);
        let result = true;
        result = await verifySchema(requiredKeys, d, jsonContent);

        out = Bool(result);

        if (result) {
            console.log("Schema verification completed successfully.");
        } else {
            console.log("Schema verification failed.");
        }

    return out;

} catch (err) {
    console.error('Error:', err);
}
}

//verifyActual();
verifyActualFromFile('src/data/scf/actualBL2.json'); 