import { MCPTool } from "mcp-framework";
import {getLogForPipelineStep, getPipelineResult} from "./helpers/woodpeckerCI.js";
import {pipelineDetailSchema} from "../Schema/pipelineDetail.js";

interface WoodpeckerCiPipelineReportGeneratorInput {
	repoId: string;
	pipelineNumber: string;
}

class WoodpeckerCiPipelineReportGeneratorTool extends MCPTool<WoodpeckerCiPipelineReportGeneratorInput> {
	name = "woodpecker-ci-pipeline-report-generator";
	description = `This tool is to extract all the details for the given pipeline`

	schema = pipelineDetailSchema;

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