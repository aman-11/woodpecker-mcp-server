import {ApiConfigFor, APIS} from "./apis";

interface ForgeDetails {
    name: string,
    url: string,
}

async function getRepoDetails(repoId: string) {
    const response = await fetch(APIS.GET_REPO_DETAILS(repoId), ApiConfigFor("GET"));
    const body = await response.json();
    return {
        name: body.name,
        url: body.clone_url,
    }
}

export {
    getRepoDetails,
}