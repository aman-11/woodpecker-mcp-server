import { logger, MCPTool } from "mcp-framework";
import {getLogForPipelineStep, getPipelineResult} from "./helpers/woodpeckerCI.js";
import {pipelineDetailSchema} from "../Schema/pipelineDetail.js";
import { SimpleCache } from "./helpers/cache.js";

interface WoodpeckerCiPipelineReportGeneratorInput {
	repoId: string;
	pipelineNumber: string;
}

const pipelineLogCache = new SimpleCache<any>(2 * 60 * 60 * 1000); // 2 hours cache

class WoodpeckerCiPipelineReportGeneratorTool extends MCPTool<WoodpeckerCiPipelineReportGeneratorInput> {
	name = "woodpecker-ci-pipeline-report-generator";
	description = "This tool is used to extract all the different machine logs for the given pipeline"

	schema = pipelineDetailSchema;

	async execute(input: WoodpeckerCiPipelineReportGeneratorInput) {
		const {pipelineNumber, repoId} = input;
		const cacheKey = `${repoId}:${pipelineNumber}`;

		// check cache first
		if (pipelineLogCache.has(cacheKey)) {
			logger.info('Returning cached pipeline log for key: ' + cacheKey);
			return pipelineLogCache.get(cacheKey);
		}

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
			pipelineLogCache.set(cacheKey, responseToAI);
			return responseToAI;
		}

		// If the pipeline failed, we need to fetch the logs for each failed step
		const stepDetails = pipelineResult.failedStepDetails;
		const response = await getLogForPipelineStep(repoId, pipelineNumber, stepDetails);
		responseToAI.content[0].details = `Pipeline ${pipelineNumber} for PR ${pipelineResult.pullRequestUrl} has failed.`
		responseToAI.content[0].moreDetails = response;
		pipelineLogCache.set(cacheKey, responseToAI);
		return responseToAI
	}
}

export default WoodpeckerCiPipelineReportGeneratorTool;