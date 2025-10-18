// Test MinaScan GraphQL API to find correct transaction query
const fetch = require('node-fetch');

const graphqlEndpoint = 'https://api.minascan.io/node/devnet/v1/graphql';

// Test different possible transaction queries
async function testQueries() {
  console.log('Testing MinaScan GraphQL API queries...\n');
  
  // Test 1: Try to find transactions field
  const introspectionQuery = `
    query {
      __schema {
        queryType {
          fields {
            name
            description
            args {
              name
              type {
                name
                kind
              }
            }
          }
        }
      }
    }
  `;
  
  try {
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: introspectionQuery })
    });
    
    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL Error:', JSON.stringify(data.errors, null, 2));
      return;
    }
    
    const queryFields = data.data.__schema.queryType.fields;
    
    // Find transaction-related fields
    console.log('Available Query Fields:\n');
    queryFields.forEach(field => {
      if (field.name.toLowerCase().includes('transaction') || 
          field.name.toLowerCase().includes('block')) {
        console.log(`- ${field.name}`);
        console.log(`  Description: ${field.description || 'No description'}`);
        if (field.args && field.args.length > 0) {
          console.log(`  Arguments:`);
          field.args.forEach(arg => {
            console.log(`    - ${arg.name} (${arg.type.name || arg.type.kind})`);
          });
        }
        console.log('');
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testQueries();
