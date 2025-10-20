import 'dotenv/config'
import _ from "lodash";
import axios from "axios";
import fs from "fs";
import { Octokit } from "@octokit/rest";

const swaggerUrl = process.env.SWAGGER_URL;
const octokit = new Octokit({ auth: process.env.GH_TOKEN });

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
    json = json.replaceAll(
        /(?:\w+[.])+(?<a>\w+)`1\[\[(?:\w+[.])+(?<b>\w+)/g,
        (...args) => {
            const groups = args.at(-1); // last argument is the groups object
            return `${groups.a}_${groups.b}`;
        }
      ).replaceAll(', HelloAsso.Api.V5.Models, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null]]', '');

    return json;
}

async function getCurrentFileContent() {
    const owner = process.env.GH_REPO_OWNER;
    const repo = process.env.GH_REPO_NAME;
    const filePath = 'helloasso.json';

    try {
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: filePath,
            ref: process.env.GH_BASE_BRANCH
        });

        return Buffer.from(data.content, 'base64').toString('utf8');
    } catch (error) {
        if (error.status === 404) {
            console.log("⚠️ Le fichier n'existe pas encore dans le repo.");
            return null;
        } else {
            throw error;
        }
    }
}

async function createPullRequest(jsonString) {
    const owner = process.env.GH_REPO_OWNER;
    const repo = process.env.GH_REPO_NAME;
    const baseBranch = process.env.GH_BASE_BRANCH;
    const branchName = `update-swagger-${Date.now()}`;
    const filePath = 'helloasso.json';

    const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${baseBranch}`
    });

    const baseSha = refData.object.sha;

    await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: baseSha
    });

    let fileSha = null;
    try {
        const { data: fileData } = await octokit.repos.getContent({
            owner,
            repo,
            path: filePath,
            ref: baseBranch
        });
        fileSha = fileData.sha; // SHA actuel du fichier
    } catch (error) {
        if (error.status === 404) {
            console.log("ℹ️ Le fichier n'existe pas encore, il sera créé.");
        } else {
            throw error;
        }
    }

    await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: 'Update helloasso swagger definition',
        content: Buffer.from(jsonString).toString('base64'),
        branch: branchName,
        sha: fileSha
    });

    const pr = await octokit.pulls.create({
        owner,
        repo,
        title: '✨ Mise à jour automatique du fichier Swagger HelloAsso',
        head: branchName,
        base: baseBranch,
        body: 'Cette PR met à jour automatiquement le fichier Swagger via un script automatisé.'
    });

    console.log('✅ Pull Request créée avec succès:', pr.data.html_url);
}

async function generateAndCreatePR() {
    const json = await downloadSwagger();
    const changesJson = readChanges();
    const modifiedJson = modifySwagger(json, changesJson);

    const currentContent = await getCurrentFileContent();

    if (currentContent === modifiedJson) {
        console.log("✅ Aucune modification détectée, pas de PR créée.");
    } else {
        console.log("🚀 Des modifications ont été détectées, création de la PR...");
        await createPullRequest(modifiedJson);
    }
}

generateAndCreatePR();