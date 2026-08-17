import type { BuildJob, ProjectType } from "@/lib/build-store";

export type RestartBuildInput = {
  projectName: string;
  projectType: ProjectType;
  sourceName: string;
  sourceSize?: number;
  sourceUri: string;
};

/** Préserve l’intégralité de la sélection initiale pour une nouvelle compilation. */
export function makeRestartBuildInput(previousJob: BuildJob): RestartBuildInput {
  return {
    projectName: previousJob.projectName,
    projectType: previousJob.projectType,
    sourceName: previousJob.sourceName,
    sourceSize: previousJob.sourceSize ?? undefined,
    sourceUri: previousJob.sourceUri,
  };
}
