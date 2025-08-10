import {z} from "zod";

export const gitPipelineDetailSchema = {
    repoName: {
        type: z.string(),
        description: "Repository name (e.g., 'my-project'). Can be extracted from git remote URL or current working directory",
    },
    pullRequestNumber: {
        type: z.string(),
        description: "Pull Request number. Can be extracted from current git branch or provided explicitly",
    },
    branchName: {
        type: z.string().optional(),
        description: "Git branch name. Can be extracted from current git branch if not provided",
    }
};
