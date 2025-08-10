import {ApiConfigFor, APIS} from "./apis.js";
import { SimpleCache } from "./cache.js";
import { Injectable } from "./ServiceManager.js";

interface CurrentForge {
    repoName: string,
    owner?: any,
    pullRequestNumber?: string,
}

interface ForgePipelineDetails {
    status: string;
    pipelineNumber: string;
    repoId: string;
}

@Injectable()
class WoodpeckerForgesService {
    // Cache for repo name to forge ID mapping (24 hours TTL)
    private repoMappingCache = new SimpleCache<string>(24 * 60 * 60 * 1000); // 24 hours

    async findCurrentForge(forge: CurrentForge): Promise<string> {
        const cacheKey = `repo:${forge.repoName}`;

        // Check cache first
        if (this.repoMappingCache.has(cacheKey)) {
            return this.repoMappingCache.get(cacheKey)!;
        }

        // Fetch from API if not cached
        const response = await fetch(APIS.GET_REPO_DETAILS(), ApiConfigFor("GET"));
        if (!response.ok) {
            throw new Error(`Failed to fetch repository details: ${response.statusText}`);
        }

        const allForges = await response.json();
        let currentForgeId: string = '';
        allForges.forEach((repo: any) => {
            if (repo.name === forge.repoName) {
                currentForgeId = repo.forge_id as string;
            }
        });

        // Cache the result if found
        if (currentForgeId) {
            this.repoMappingCache.set(cacheKey, currentForgeId);
        }

        return currentForgeId;
    }

    async getPipelineDetails(forge: CurrentForge): Promise<ForgePipelineDetails> {
        const repoId = await this.findCurrentForge(forge);
        const url = new URL(APIS.GET_PIPELINES(repoId));

        // Query parameters
        url.searchParams.append("page", "1");
        url.searchParams.append("perPage", "1");
        url.searchParams.append("ref", `refs/pull/${forge.pullRequestNumber}/merge`);

        try {
            const response = await fetch(url.toString(), ApiConfigFor("GET"));

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            return {
                repoId,
                status: data[0].status,
                pipelineNumber: data[0].number,
            }
        } catch (error) {
            console.error("Error fetching pipelines:", error);
            throw error;
        }
    }

    /**
     * Clear all caches - used during service shutdown
     */
    public clearCache(): void {
        this.repoMappingCache.clear();
    }
}

// Export the service class
export { WoodpeckerForgesService };
