const axios = require('axios');
const fs = require('fs');

// API URL
const url = 'http://localhost:8082/eventsBatch'; // Change this to your actual API URL

// Function to fetch JSON data and save it to a file
const fetchDataAndSave = async () => {
  try {
    // Make a GET request using Axios
    const response = await axios.get(url);
    
    console.log('Response Code:', response.status);
    console.log('Response Body:', response.data);

    // Convert response to JSON string with formatting
    const jsonData = JSON.stringify(response.data, null, 2);

    // Ensure the `src` folder exists before writing
    const filePath = 'response.json';
    

    // Write JSON response to file
    fs.writeFileSync(filePath, jsonData, 'utf8');
    console.log(`Response saved to ${filePath}`);
  } catch (error) {
    console.error('Error fetching data:', error.message);

    // Log additional error details
    if (error.response) {
      console.error('Response Code:', error.response.status);
      console.error('Response Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Request Setup Error:', error.message);
    }
  }
};

// Run the function
fetchDataAndSave();
