const AWS = require('aws-sdk');
const axios = require('axios');

const s3 = new AWS.S3();

exports.handler = async (event, context) => {
    // S3 Bucket Name
    const s3_bucket_name = 'rotn-webflow-menu-news-sync';

    // Map of item IDs to file names
    const itemFileMap = {
        '64178531a3139e6ecbff29ef': '1',
        '641794987701c21e08c1a522': '2',
        '641794e536dcd332b1fc329e': '3',
        '6417952b628839512738e373': '4',
    };

    const collection_id = '640fcbc3c37f0145949f446f';

    // Set OAuth token in AWS Lambda Environment Variables
    const webflow_bearer_token = process.env.WEBFLOW_BEARER_TOKEN;

    try {
        for (const item_id of Object.keys(itemFileMap)) {
            // Makes a GET request to the Webflow CMS API to fetch the CMS item for each item_id
            const url = `https://api.webflow.com/beta/collections/${collection_id}/items/${item_id}`;
            const headers = {
                'accept': 'application/json',
                'authorization': `Bearer ${webflow_bearer_token}`,
            };
            const response = await axios.get(url, { headers });
            const cms_data = response.data;

            // Extracts data from the Webflow API response
            const ticker_text = cms_data.fieldData['ticker-text'];
            const icon_url = cms_data.fieldData.icon.url;
            const ticker_url = cms_data.fieldData['ticker-url'];

            // Determines the file names based on the item_id
            const fileNamePrefix = `ticker_${itemFileMap[item_id]}`;

            // Writes ticker-text to S3 bucket with the appropriate naming convention
            await s3
                .putObject({
                    Bucket: s3_bucket_name,
                    Key: `ticker_live/${fileNamePrefix}_en_us.txt`,
                    Body: ticker_text,
                    ContentType: 'text/plain',
                })
                .promise();

            // Creates a dictionary for icon and ticker-url
            const json_data = {
                icon: icon_url,
                url: ticker_url,
            };

            // Writes the JSON data to S3 bucket with the appropriate naming convention
            await s3
                .putObject({
                    Bucket: s3_bucket_name,
                    Key: `ticker_live/${fileNamePrefix}.json`,
                    Body: JSON.stringify(json_data),
                    ContentType: 'application/json',
                })
                .promise();
        }

        return {
            statusCode: 200,
            body: JSON.stringify('Data updated successfully in S3 for all item_ids'),
        };
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};
