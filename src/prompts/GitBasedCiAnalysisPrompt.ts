import { MCPPrompt } from "mcp-framework";
import { gitPipelineDetailSchema } from "../Schema/gitPipelineDetail.js";

interface GitBasedCiAnalysisInput {
	repoName?: string;
	pullRequestNumber?: string;
	branchName?: string;
	repoId?: string;
	pipelineNumber?: string;
}

class GitBasedCiAnalysisPrompt extends MCPPrompt<GitBasedCiAnalysisInput> {
	name = "analyze-pr-failures";
	description = "Analyzes CI/PR failures using git context from IDE. Works with repository name, PR number, or branch name to automatically find and analyze the relevant pipeline.";

	schema = gitPipelineDetailSchema;

	async generateMessages({ repoName, pullRequestNumber, branchName, repoId, pipelineNumber }: GitBasedCiAnalysisInput) {
		return [
			{
				"role": "system",
				"content": {
					"type": "text",
					"text": `You are a CI-debug assistant with IDE capabilities.

INITIAL SETUP
1. First, use git-based-pipeline-analyzer with the provided context to automatically resolve repository and pipeline details.
2. If context is incomplete, attempt to read from IDE:
   • Current repository name from git remote or workspace
   • Current branch name from git status
   • PR number from branch name patterns (e.g., pr-123, PR-123, pull/123)
3. Auto-resolve the appropriate pipeline using the resolved context.

WORKFLOW
1. Call git-based-pipeline-analyzer for the supplied context (repoName, pullRequestNumber, branchName).
   • This will internally resolve to specific repoId/pipelineNumber and call woodpecker-ci-pipeline-report-generator
2. Analyse only the *final attempt* of each failing scenario.
3. Produce a report in two sections delimited by these **exact** markers:
   HUMAN_REPORT_START … HUMAN_REPORT_END   (Markdown for humans)
   MACHINE_JSON_START … MACHINE_JSON_END   (strict JSON for tools)
   • The Markdown table MUST have the columns:
     # | Scenario | Scenario File | Code File | Failure Type | Brief Cause | Proposed Fix
   • Use the first entry from \`relatedFiles\` as the **Code File** column.
4. For **every unique path** found in either \`scenarioFile\` or \`relatedFiles\`:
   a. Attempt \`ide.openFile(<path>)\` to load its current content.
      • If the file cannot be opened (path wrong / missing), ask the user for the correct location.
   b. Perform a quick static analysis and draft the *smallest* viable patch that addresses the failure.
   c. Prompt the user **per file**:
      "Apply the suggested fix to <path>? (yes / no)"
   d. Call \`ide.applyEdit\` **only after** the user replies "yes".
      • Use a clear \`commitMessage\`, e.g. "fix: hide Milestone Amount button on Pending Approval quotes".
5. If evidence is insufficient to determine a root cause or craft a patch, ask clarifying questions rather than guessing.

REPORT FORMAT (must match exactly)
HUMAN_REPORT_START
## CI Failure Analysis – ${this.buildContextHeader({ repoName, pullRequestNumber, branchName, repoId, pipelineNumber })}
| # | Scenario | Scenario File | Code File | Failure Type | Brief Cause | Proposed Fix |
|---|----------|---------------|-----------|--------------|-------------|--------------|
… rows …

### Details
#### <Scenario 1>
\`\`\`log
…key log lines…
\`\`\`
*Scenario file*: <path:line>  
*Root cause* …  
*Fix suggestions* …
HUMAN_REPORT_END

MACHINE_JSON_START
{
  "pipeline": "<resolved-pipeline-number>",
  "repoId": "<resolved-repo-id>",
  "context": {
    "repoName": "${repoName || 'auto-detected'}",
    "pullRequestNumber": "${pullRequestNumber || 'N/A'}",
    "branchName": "${branchName || 'auto-detected'}"
  },
  "analysedAt": "<ISO-8601>",
  "failures": [
    {
      "scenario": "<string>",
      "scenarioFile": "<features/…:line>",
      "workflow": "<string>",
      "step": "<string>",
      "failureType": "timeout|assertion|network|infra|unknown",
      "isFlaky": false,
      "rootIndicators": ["<string>", "…"],
      "proposedFix": "<string>",
      "logSlice": ["<first & last 20 lines>"],
      "relatedFiles": ["<repo/path:line>", "…"]
    }
  ]
}
MACHINE_JSON_END

NEVER call ide.applyEdit until the user replies "yes" for that specific file.`
				}
			},
			{
				"role": "user",
				"content": {
					"type": "text",
					"text": `Analyse CI failures for ${this.buildUserContext({ repoName, pullRequestNumber, branchName, repoId, pipelineNumber })}. Use git-based-pipeline-analyzer to automatically resolve and fetch the pipeline data. After the report, open every scenario and code file implicated in a failure, suggest minimal patches, and ask me before applying any change.`
				}
			},
			{
				"role": "assistant",
				"content": {
					"type": "text",
					"text": `Understood. I will use the git-based-pipeline-analyzer to resolve the pipeline details from the provided context, fetch the logs, generate the report with scenario-to-file mapping, inspect each implicated file in the repository directory, propose fixes, and confirm with you before making edits.`
				}
			},
			{
				"role": "user",
				"content": {
					"type": "text",
					"text": `Use git-based-pipeline-analyzer with the provided context to automatically resolve repository and pipeline details, then proceed with the analysis.`
				}
			}
		];
	}

	private buildContextHeader(input: GitBasedCiAnalysisInput): string {
		const parts = [];
		if (input.pipelineNumber) parts.push(`pipeline #${input.pipelineNumber}`);
		if (input.repoName) parts.push(`repo: ${input.repoName}`);
		if (input.pullRequestNumber) parts.push(`PR #${input.pullRequestNumber}`);
		if (input.branchName) parts.push(`branch: ${input.branchName}`);

		return parts.length > 0 ? parts.join(' | ') : 'auto-detected context';
	}

	private buildUserContext(input: GitBasedCiAnalysisInput): string {
		const parts = [];
		if (input.repoName) parts.push(`repository: ${input.repoName}`);
		if (input.pullRequestNumber) parts.push(`PR #${input.pullRequestNumber}`);
		if (input.branchName) parts.push(`branch: ${input.branchName}`);
		if (input.pipelineNumber) parts.push(`pipeline #${input.pipelineNumber}`);

		return parts.length > 0 ? parts.join(', ') : 'current workspace context';
	}
}

export default GitBasedCiAnalysisPrompt;
