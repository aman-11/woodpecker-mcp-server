import { logger, MCPTool } from "mcp-framework";
import { gitPipelineDetailSchema } from "../Schema/gitPipelineDetail.js";
import WoodpeckerCiPipelineReportGeneratorTool from "./WoodpeckerCiPipelineReportGeneratorTool.js";
import { WoodpeckerForgesService } from "./helpers/woodpeckerForges.js";
import { inject } from "./helpers/ServiceManager.js";

interface GitBasedPipelineAnalyzerInput {
  repoName: string;
  pullRequestNumber: string;
  branchName?: string;
}

export class GitBasedPipelineAnalyzerTool extends MCPTool<GitBasedPipelineAnalyzerInput> {
  name = "git-based-pipeline-analyzer";
  description = "Analyzes CI pipeline failures using git context from IDE. Can auto-resolve repository and pipeline details from git information like repo name, PR number, or branch name.";

  schema = gitPipelineDetailSchema;

  private woodpeckerTool: WoodpeckerCiPipelineReportGeneratorTool = new WoodpeckerCiPipelineReportGeneratorTool();

  public constructor(private woodpeckerForgesService: WoodpeckerForgesService = inject<WoodpeckerForgesService>('WoodpeckerForgesService')) {
    super();
  }

  async execute(input: GitBasedPipelineAnalyzerInput) {
    const { repoName, pullRequestNumber } = input;

    // Always fetch latest pipeline details for the PR
    // (No caching here since PRs can have multiple pipelines as new commits are pushed)
    logger.info(`Resolving latest pipeline details for: ${repoName} PR #${pullRequestNumber}`);
    const pipelineDetails = await this.woodpeckerForgesService.getPipelineDetails({ repoName, pullRequestNumber });

    const { repoId, pipelineNumber, status } = pipelineDetails;

    if (status === 'running') {
      return {
        content: [{
          type: "text",
          details: `Pipeline for repository '${repoName}' PR #${pullRequestNumber} is currently running. Please wait for it to complete before analyzing failures.`,
          moreDetails: []
        }]
      };
    }

    // Execute the original tool with resolved parameters
    // (WoodpeckerCiPipelineReportGeneratorTool already handles its own caching)
    logger.info(`Analyzing pipeline ${pipelineNumber} for repository ${repoId}`);
    return await this.woodpeckerTool.execute({
      repoId,
      pipelineNumber
    });
  }
}

export default GitBasedPipelineAnalyzerTool;
