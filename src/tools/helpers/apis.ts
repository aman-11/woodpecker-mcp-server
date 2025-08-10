export const APIS = {
    GET_PIPELINE_DETAIL: (repoId: string, pipelineId: string) => `${process.env.WOODPECKER_SERVER}/repos/${repoId}/pipelines/${pipelineId}`,
    GET_LOG_FOR_PIPELINE_STEP: (repoId: string, pipelineId: string, stepId: string ) => `${process.env.WOODPECKER_SERVER}/repos/${repoId}/logs/${pipelineId}/${stepId}`,
    GET_REPO_DETAILS: () => `${process.env.WOODPECKER_SERVER}/repos`,
    GET_PIPELINES: (repoId: string) => `${process.env.WOODPECKER_SERVER}/repos/${repoId}/pipelines`
}

export function ApiConfigFor (method: string) {
    return {
        method: method,
        headers: {
            "Authorization": `Bearer ${process.env.WOODPECKER_TOKEN}`,
            "Content-Type": "application/json",
        },
    }
}
