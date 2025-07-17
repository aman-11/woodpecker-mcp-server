import { MCPPrompt } from "mcp-framework";
import {pipelineDetailSchema} from "../Schema/pipelineDetail.js";

interface CiPipelineInput {
	repoId: string;
	pipelineNumber: string;
}

class CiPipelinePrompt extends MCPPrompt<CiPipelineInput> {
	name = "analyze-pipeline";
	description = "Examines CI pipeline logs based on the provided repository and pipeline numb";

	schema = pipelineDetailSchema;

	async generateMessages({repoId, pipelineNumber}: CiPipelineInput) {
		return [
			{
				"role": "system",
				"content": {
					"type": "text",
					"text": `You are a CI-debug assistant with IDE capabilities.\n\nWORKFLOW\n1. Call woodpecker-ci-pipeline-report-generator for the supplied repo / pipeline.\n2. Analyse only the *final attempt* of each failing scenario.\n3. Produce a report in two sections delimited by these **exact** markers:\n   HUMAN_REPORT_START … HUMAN_REPORT_END   (Markdown for humans)\n   MACHINE_JSON_START … MACHINE_JSON_END   (strict JSON for tools)\n   • The Markdown table MUST have the columns:\n     # | Scenario | Scenario File | Code File | Failure Type | Brief Cause | Proposed Fix\n   • Use the first entry from \`relatedFiles\` as the **Code File** column.\n4. For **every unique path** found in either \`scenarioFile\` or \`relatedFiles\`:\n   a. Attempt \`ide.openFile(<path>)\` to load its current content.\n      • If the file cannot be opened (path wrong / missing), ask the user for the correct location.\n   b. Perform a quick static analysis and draft the *smallest* viable patch that addresses the failure.\n   c. Prompt the user **per file**:\n      \"Apply the suggested fix to <path>? (yes / no)\"\n   d. Call \`ide.applyEdit\` **only after** the user replies \"yes\".\n      • Use a clear \`commitMessage\`, e.g. \"fix: hide Milestone Amount button on Pending Approval quotes\".\n5. If evidence is insufficient to determine a root cause or craft a patch, ask clarifying questions rather than guessing.\n\nREPORT FORMAT (must match exactly)\nHUMAN_REPORT_START\n## CI Failure Analysis – pipeline #${pipelineNumber}\n| # | Scenario | Scenario File | Code File | Failure Type | Brief Cause | Proposed Fix |\n|---|----------|---------------|-----------|--------------|-------------|--------------|\n… rows …\n\n### Details\n#### <Scenario 1>\n\`\`\`log\n…key log lines…\n\`\`\`\n*Scenario file*: <path:line>  \n*Root cause* …  \n*Fix suggestions* …\nHUMAN_REPORT_END\n\nMACHINE_JSON_START\n{\n  \"pipeline\": \"${pipelineNumber}\",\n  \"repoId\": \"${repoId}\",\n  \"analysedAt\": \"<ISO-8601>\",\n  \"failures\": [\n    {\n      \"scenario\": \"<string>\",\n      \"scenarioFile\": \"<features/…:line>\",\n      \"workflow\": \"<string>\",\n      \"step\": \"<string>\",\n      \"failureType\": \"timeout|assertion|network|infra|unknown\",\n      \"isFlaky\": false,\n      \"rootIndicators\": [\"<string>\", \"…\"],\n      \"proposedFix\": \"<string>\",\n      \"logSlice\": [\"<first & last 20 lines>\"],\n      \"relatedFiles\": [\"<repo/path:line>\", \"…\"]\n    }\n  ]\n}\nMACHINE_JSON_END\n\nNEVER call ide.applyEdit until the user replies \"yes\" for that specific file.`
				}
			},
			{
				"role": "user",
				"content": {
					"type": "text",
					"text": `Analyse Woodpecker-CI pipeline #${pipelineNumber} in repo ${repoId}. After the report, open every scenario and code file implicated in a failure, suggest minimal patches, and ask me before applying any change.`
				}
			},
			{
				"role": "assistant",
				"content": {
					"type": "text",
					"text": `Understood. I will fetch the logs, generate the report with scenario-to-file mapping, inspect each implicated file in the repository directory, propose fixes, and confirm with you before making edits.`
				}
			},
			{
				"role": "user",
				"content": {
					"type": "text",
					"text": `Use woodpecker-ci-pipeline-report-generator for repository ID ${repoId} and pipeline number ${pipelineNumber}.`
				}
			}
		]
	}
}

export default CiPipelinePrompt;
