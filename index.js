require('dotenv').config();
const _ = require('lodash');
const axios = require('axios');
const fs = require('fs');

const swaggerUrl = process.env.SWAGGER_URL;

async function downloadSwagger() {
    try {
        const response = await axios.get(swaggerUrl);
        return response.data;
    } catch (error) {
        console.error('Erreur lors du téléchargement du fichier Swagger:', error);
        throw error;
    }
}

function readChanges() {
    try {
        const changes = fs.readFileSync('changes.json', 'utf8');
        return JSON.parse(changes);
    } catch (error) {
        console.error('Erreur lors de la lecture du fichier de modifications:', error);
        throw error;
    }
}

function modifySwagger(swaggerData, changes) {
    _.merge(swaggerData, changes);

    json = JSON.stringify(swaggerData, null, 2);
    json = json.replaceAll('HelloAsso.Api.V5.Models.Common.ResultsWithPaginationModel`1[[HelloAsso.Api.V5.Models.Directory.', 'ResultsWithPaginationModel_')
        .replaceAll('HelloAsso.Api.V5.Models.Common.ResultsWithPaginationModel`1[[HelloAsso.Api.V5.Models.Forms.', 'ResultsWithPaginationModel_')
        .replaceAll('HelloAsso.Api.V5.Models.Common.ResultsWithPaginationModel`1[[HelloAsso.Api.V5.Models.Statistics.', 'ResultsWithPaginationModel_')
        .replaceAll('HelloAsso.Api.V5.Models.Common.ResultsWithPaginationModel`1[[HelloAsso.Api.V5.Models.Payment.', 'ResultsWithPaginationModel_')
        .replaceAll(', HelloAsso.Api.V5.Models, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null]]', '')

    return json;
}

function writeJsonToFile(jsonString, filename) {
    fs.writeFileSync(filename, jsonString, 'utf8');
    console.log(`Data written to ${filename}`);
}

async function uploadToReadMe(jsonString) {
    const formData = new FormData();
    formData.append('spec', jsonString);

    const config = {
        headers: {
            'accept': 'application/json',
            'x-readme-version': 'v1',
            'Authorization': `Basic ${Buffer.from(`${process.env.README_API_KEY}:`).toString('base64')}`
        }
    };

    try {
        const response = await axios.put(`https://dash.readme.com/api/v1/api-specification/${process.env.API_ID}`, formData, config);
        console.log('Swagger successfully uploaded:', response.data);
    } catch (error) {
        console.error('Failed to upload Swagger file:', error);
    }
}

async function main() {
    const json = await downloadSwagger();
    const changesJson = readChanges();
    const jsonString = modifySwagger(json, changesJson);
    writeJsonToFile(jsonString, 'output.json');
    uploadToReadMe(jsonString);
}

main();
