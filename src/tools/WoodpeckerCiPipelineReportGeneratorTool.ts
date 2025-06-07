import { MCPTool } from "mcp-framework";
import { z } from "zod";

import {getLogForPipelineStep, getPipelineResult} from "./helpers/woodpeckerCI.js";

interface WoodpeckerCiPipelineReportGeneratorInput {
  repoId: string;
  pipelineNumber: string;
}

class WoodpeckerCiPipelineReportGeneratorTool extends MCPTool<WoodpeckerCiPipelineReportGeneratorInput> {
  name = "woodpecker-ci-pipeline-report-generator";
  description = `This tool is to extract all the details for the given pipeline by user
        Below is an array of objects representing the failed workflow steps.
        Each object includes:
        
        The workflow name
        
        The step name where the failure occurred
        
        A logs array containing the line-by-line execution output in sequence
        
        Note for analysis:
        When parsing these logs, only consider the last attempt (Attempt 2) for each scenario.
        If multiple attempts exist (e.g., 3 attempts for the same step), it indicates earlier retries and only the final failure is relevant for diagnosis.`

  schema = {
    repoId: {
      type: z.string().length(1),
      description: "Repository ID extracted from Woodpecker CI pipeline URL. " +
          "Extract using regex: /\\/repos\\/([^/]+)/ from " +
          "URLs like 'https://woodpecker.provus.dev/repos/1/pipeline/100577' to get the repo ID (e.g., '1')",
    },
    pipelineNumber: {
      type: z.string(),
      description: "Pipeline number extracted from Woodpecker CI pipeline URL. " +
          "Extract using regex: /\\/pipeline\\/([^/]+) from " +
          "URLs like 'https://woodpecker.provus.dev/repos/1/pipeline/100577' to get the piepline number (e.g., '100577')",
    },
  };

  async execute(input: WoodpeckerCiPipelineReportGeneratorInput) {
    const {pipelineNumber, repoId} = input;
    // check failure first
    const pipelineResult = await getPipelineResult(repoId, pipelineNumber);
    const responseToAI = {
      content: [{
        type: "text",
        details: pipelineResult.isSuccess ? `Pipeline ${pipelineNumber} for PR ${pipelineResult.pullRequestUrl} completed successfully. No failed steps detected.`
            : pipelineResult.error,
        moreDetails: [] as any[]
      }],
    }

    if (pipelineResult.isSuccess || pipelineResult.error?.includes("Failed to fetch")) {
      return responseToAI;
    }

    // If the pipeline failed, we need to fetch the logs for each failed step
    const stepDetails = pipelineResult.failedStepDetails;
    const response = await getLogForPipelineStep(repoId, pipelineNumber, stepDetails);
    responseToAI.content[0].details = `Pipeline ${pipelineNumber} for PR ${pipelineResult.pullRequestUrl} has failed.`
    responseToAI.content[0].moreDetails = response;
    return responseToAI
  }
}

export default WoodpeckerCiPipelineReportGeneratorTool;