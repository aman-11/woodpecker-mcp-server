import { decode } from 'js-base64';
import { APIS, ApiConfigFor } from "./apis.js";

interface CIResponse {
    isSuccess: boolean;
    error?: string;
}

interface IPipelineFailedStepDetails {
    workflowName: string;
    stepId: string;
    stepName: string;
}

interface IPipelineResult extends CIResponse {
    pullRequestUrl: string,
    failedStepDetails: IPipelineFailedStepDetails[];
}

interface IPipelineStepLogResult extends CIResponse {
    workflowName: string;
    stepName: string;
    log: string[];
}

async function getPipelineResult(repoId: string, pipelineId: string): Promise<IPipelineResult> {
    const response = await fetch(APIS.GET_PIPELINE_DETAIL(repoId, pipelineId), ApiConfigFor("GET"));
    const data = await response.json();

    if (!response.ok) {
        return { isSuccess: false, pullRequestUrl:data.forge_url,  failedStepDetails: [], error: `Failed to fetch pipeline details: ${response.statusText}` };
    }

    return extractDetailsFromPipeline(data);

}

async function getLogForPipelineStep(repoId: string, pipelineId: string, stepDetails: IPipelineFailedStepDetails[]) {
    const logPromises = stepDetails.map(detail => fetchLogForStep(repoId, pipelineId, detail));
    return (await Promise.all(logPromises));

}

async function fetchLogForStep(repoId: string, pipelineId: string, detail: IPipelineFailedStepDetails) : Promise<IPipelineStepLogResult> {
    const result:IPipelineStepLogResult = {
        isSuccess: false,
        workflowName: detail.workflowName,
        stepName: detail.stepName,
        log: [],
    };
    const response = await fetch(APIS.GET_LOG_FOR_PIPELINE_STEP(repoId, pipelineId, detail.stepId), ApiConfigFor("GET"));
    if (!response.ok) {
        return {
            ...result,
            error: `Failed to fetch log for step ${detail.stepName} for a workflow ${detail.workflowName}: ${response.statusText}`
        };
    }

    const logs = await response.json();
    // logs are encoded as base64 we need to decode them
    logs.forEach((log: any) => {
        result.log.push(decode(log.data));
    });
    return result;
}

function extractDetailsFromPipeline(data: any): IPipelineResult {
    // Implement logic to extract details from the pipeline
    // This could involve parsing the pipeline data and returning relevant information
    const pipelineResult: IPipelineResult = { isSuccess: false, pullRequestUrl: data.forge_url, failedStepDetails: [] };
    if (data.status !== 'failure') {
        pipelineResult.isSuccess = true;
        return pipelineResult;
    }

    // If the pipeline failed, you might want to extract more details
    const failedStepDetails: IPipelineFailedStepDetails[] = [];
    pipelineResult.failedStepDetails = failedStepDetails;

    data.workflows.forEach((workflow:any) => {
        if (workflow.state === "failure") {
            const workflowName = workflow.environ ? `${workflow.name} on ${workflow.environ.runner}` : workflow.name;
            workflow.children.forEach((child: any) => {
                if (child.state === "failure") {
                    failedStepDetails.push({
                        workflowName,
                        stepId: child.id,
                        stepName: child.name,
                    });
                }
            });
        }
    });

    return pipelineResult;
}

export {
    getPipelineResult,
    getLogForPipelineStep,
}