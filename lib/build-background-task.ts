import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { loadBuildJobs, refreshBuildJob } from "@/lib/build-store";

export const BUILD_STATUS_TASK = "mia-check-build-status";

if (Platform.OS !== "web" && !TaskManager.isTaskDefined(BUILD_STATUS_TASK)) {
  TaskManager.defineTask(BUILD_STATUS_TASK, async () => {
    try {
      const jobs = await loadBuildJobs();
      const activeJobs = jobs.filter((job) => job.status === "queued" || job.status === "building");
      await Promise.all(activeJobs.map((job) => refreshBuildJob(job)));
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/** Android runs this deferred check no more frequently than its 15 minute system minimum. */
export async function ensureBuildStatusBackgroundTask() {
  if (Platform.OS === "web") return false;
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(BUILD_STATUS_TASK);
    if (!registered) await BackgroundTask.registerTaskAsync(BUILD_STATUS_TASK, { minimumInterval: 15 });
    return true;
  } catch {
    return false;
  }
}
