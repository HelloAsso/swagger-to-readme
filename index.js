import 'dotenv/config'
import _ from "lodash";
import axios from "axios";
import fs from "fs";
import inquirer from "inquirer";

const swaggerUrl = process.env.SWAGGER_URL;
const filePath = '../helloasso-open-api/helloasso.json';

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

function removeSecurityBlocks(obj) {
    if (Array.isArray(obj)) {
        return obj.map(removeSecurityBlocks);
    } else if (obj && typeof obj === 'object') {
        for (const key in obj) {
            if (key === 'security' || key === 'securitySchemes') {
                delete obj[key];
            } else {
                obj[key] = removeSecurityBlocks(obj[key]);
            }
        }
    }
    return obj;
}

function modifySwagger(swaggerData, changes) {
    swaggerData = removeSecurityBlocks(swaggerData);
    _.merge(swaggerData, changes);

    var json = JSON.stringify(swaggerData, null, 2);
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

async function generateFile() {
    const json = await downloadSwagger();
    const changesJson = readChanges();
    const jsonString = modifySwagger(json, changesJson);
    writeJsonToFile(jsonString, filePath);
}

function pushToReadme() {
    const jsonString = fs.readFileSync(filePath, 'utf8');
    console.log(jsonString);
    //uploadToReadMe(jsonString);
}

inquirer
    .prompt([
        {
        type: 'list',
        name: 'action',
        message: 'Please choose an action:',
        choices: [
            'Generate file',
            'Push to README',
            'Exit',
        ],
        },
    ])
    .then((answers) => {
        switch (answers.action) {
        case 'Generate file':
            generateFile();
            break;
        case 'Push to README':
            pushToReadme();
            break;
        case 'Exit':
            console.log('Exiting the wizard. Goodbye!');
            process.exit(0);
        default:
            console.log('Unknown action selected.');
        }
    })
    .catch((error) => {
        if (error.isTtyError) {
        console.error('Interactive shell is not supported in this environment.');
        } else {
        console.error('An error occurred:', error);
        }
    });