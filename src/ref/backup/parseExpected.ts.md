import * as path from "path";
import { exec } from 'child_process';
import * as fs from 'fs'; 
import * as yaml from 'yaml'; 
import { promisify } from 'util'; 
import {UInt8, Bool, Bytes, method, CircuitString} from 'o1js';
// import {fun0,fun1,fun2} from './regexCircuits.js'


class Bytes50 extends Bytes(50){}


//import yaml from 'js-yaml';

const execPromise = promisify(exec);
interface NestedObject {
    properties?: { [key: string]: NestedObject };
    required?: string[];
    type:string;
}

interface patternObject{
    type: string;
    pattern? : string;
    enum? : string[];
}

interface RequiredKeysObject {
    [key: string]: RequiredKeysObject | patternObject ;
}
  
let dict: { [key: string]: string } = {}; 


//parse the swagger
export async function parseAndDereference(filePath: string): Promise<any> { 
  const fileContent = fs.readFileSync(filePath, 'utf8'); 
  const api = yaml.parse(fileContent); 
  
  function resolveRefs(obj: any, basePath: string): Promise<any> { 
    if (typeof obj !== 'object' || obj === null) { return obj; } 
    if ('$ref' in obj) { 
      const refPath = obj['$ref'].replace('#/', '').split('/'); 
      let refObj = api; 
      for (const part of refPath) { 
        refObj = refObj[part]; 
      } 
      return resolveRefs(refObj, basePath); 
    } 
    for (const key in obj) { 
      obj[key] = resolveRefs(obj[key], basePath); 
    } 
    return obj; 
  } 
  return resolveRefs(api, path.dirname(filePath)); 
}

//extract pattern
export function extractPattern(obj: patternObject): patternObject { 
    const patternObj: patternObject = { type: obj.type }; 
    if (obj.pattern) { 
        patternObj.pattern = obj.pattern; 
        if (!(obj.pattern in dict)) { 
            dict[obj.pattern] = `fun${Object.keys(dict).length}`; 
        } 
    } 
    if (obj.enum) { 
      patternObj.enum = obj.enum; 
    } 
    return patternObj;
}
  
//extract required fileds and pattern from schema  
export function extractRequiredKeys(obj: NestedObject): RequiredKeysObject {
    const result: RequiredKeysObject = {};
    if (obj.required) {
        const req = obj.required;
        const child=obj.properties;
        for (const key of req) {
            if (child){
                if (child[key] && (child[key].type== 'object')) {
                    const extracted = extractRequiredKeys(child[key]);
                    if (Object.keys(extracted).length > 0) {
                        result[key] = extracted;
                    }
                }
                else{
                    const pattern=extractPattern(child[key]);
                    result[key]=pattern;
                }
            }
        }
    }
    return result;
}

//return pattern dictionary
export function returnPattern(){

 return dict;
}

//generate zkregex Circuits
export async function generateCircuitsFromPatterns(patterns: { [s: string]: unknown; } | ArrayLike<unknown>, filePath: fs.PathOrFileDescriptor) { 
  for (const [pattern, functionName] of Object.entries(patterns)) { 
    const command = `zk-regex ${pattern} --functionName ${functionName} --filePath ${filePath}`; 
    try { 
      console.log(`Executing command: ${command}`); 
      await execPromise(command); 
      console.log(`Command executed successfully for pattern ${pattern}`); 
    } catch (error) { 
      console.error(`Error executing command for pattern ${pattern}:`, error); 
    }
  }
}

export function isPatternObject(obj: any): obj is patternObject { 
  return obj && typeof obj.type === 'string'; 
}

export async function parseSwagger(): Promise<void> {
    try {   
        const api = await parseAndDereference("bilSwagger.yaml"); 
        const dereferencedSwagger = api.components.schemas.TransportDocument;

        const requiredKeys = extractRequiredKeys(dereferencedSwagger);
        console.log("Required Keys JSON:");
        console.log(requiredKeys);

        console.log(`Original Pattern Dictionary: ${dict.toString()}`);
        const d= {'\\S.*\\S' :'fun0', '[A-Z]{2}': 'fun1', '\\S+': 'fun2' }            
        console.log(`Original Pattern Dictionary: ${d.toString()}`);

        const filePath = './src/circuitFile.ts';
        await generateCircuitsFromPatterns(d, filePath);
        console.log("Circuits generated successfully");

        const data = { requiredKeys, d };

        fs.writeFile('src/core/data.json', JSON.stringify(data, null, 2), (err) => {
            if (err) {
                console.error('Error writing file', err);
            } else {
                console.log('file created successfully');
            }
        });
          
    } catch (err) {
      console.error("Error parsing Swagger file:", err);
    }
  }
  
parseSwagger();