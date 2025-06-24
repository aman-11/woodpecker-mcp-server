import { MCPPrompt } from "mcp-framework";
import {pipelineDetailSchema} from "../Schema/pipelineDetail.js";
import PipelineFailureSheetResource from "../resources/PipelineFailureSheetResource.js";

interface CiPipelineInput {
	repoId: string;
	pipelineNumber: string;
}

class CiPipelinePrompt extends MCPPrompt<CiPipelineInput> {
	name = "ci-pipeline";
	description = "Examines CI pipeline logs based on the provided repository and pipeline numb";

	schema = pipelineDetailSchema;

	async generateMessages({repoId, pipelineNumber}: CiPipelineInput) {
        const failureSheet = new PipelineFailureSheetResource();
        const [existingFailureDetails] = await failureSheet.read();
		return [
			{
				role: "user",
				content: {
					type: "text",
					text: `Below is an array of objects representing the failed workflow steps.
						  Each object includes:

						  - The workflow name
						  - The step name where the failure occurred
						  - A logs array containing the line-by-line execution output in sequence

						  **Note for analysis**:
						  When parsing these logs, only consider the last attempt (e.g., Attempt 2) for each scenario. If multiple attempts exist (e.g., 3 attempts for the same step),
						  it indicates earlier retries, and only the final failure is relevant for diagnosis.`,
				},
				annotations: {
					"audience": ["assistant"],
					"priority": 1.0
				}
			},
			{
				role: "user",
				content: {
					type: "text",
					text: `Use woodpecker-ci-pipeline-report-generator tool to analyze the CI pipeline logs for repository ID ${repoId} and pipeline number ${pipelineNumber}.`
				}
			},
			{
				role: "assistant",
				content: {
					type: "text",
					text: "I'll help analyze this pipeline. Are these flaky scenarios?",
				},
			},
			{
				role: "user",
				content: {
					type: "text",
					text: "Yes, these are flaky scenarios. Check also if this has happened before",
					resource: {
						uri: existingFailureDetails.uri,
						text: existingFailureDetails.text || '',
						mimeType: existingFailureDetails.mimeType || 'application/json',
					},
				},
			},
			{
				role: "assistant",
				content: {
					type: "text",
					text: "Okay, I will analyze the logs and check for any patterns or recurring issues in the failed steps.",
				},
			},
		]
	}
}

export default CiPipelinePrompt;
