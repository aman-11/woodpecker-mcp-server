import {z} from "zod";

export const pipelineDetailSchema = {
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