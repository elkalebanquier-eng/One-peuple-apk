import type { BuildJob, ProjectType } from "@/lib/build-store";

export type RestartBuildInput = {
  projectName: string;
  projectType: ProjectType;
  sourceName: string;
  sourceSize?: number;
  sourceUri: string;
  iconName?: string;
  iconSize?: number;
  iconUri?: string;
  packageName?: string;
  appVersion?: string;
};

/** Préserve l’intégralité de la sélection initiale pour une nouvelle compilation. */
export function makeRestartBuildInput(previousJob: BuildJob): RestartBuildInput {
  return {
    projectName: previousJob.projectName,
    projectType: previousJob.projectType,
    sourceName: previousJob.sourceName,
    sourceSize: previousJob.sourceSize ?? undefined,
    sourceUri: previousJob.sourceUri,
    iconName: previousJob.iconName,
    iconSize: previousJob.iconSize ?? undefined,
    iconUri: previousJob.iconUri,
    ...(previousJob.packageName ? { packageName: previousJob.packageName } : {}),
    ...(previousJob.appVersion ? { appVersion: previousJob.appVersion } : {}),
  };
}
