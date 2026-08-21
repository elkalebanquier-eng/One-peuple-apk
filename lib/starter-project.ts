import { File, Paths } from "expo-file-system";

import { createZip } from "@/lib/html-zip";
import { getStarterProject, type StarterProjectId } from "@/shared/starter-projects";

export type PreparedStarterProject = {
  name: string;
  size: number;
  uri: string;
  projectName: string;
  projectType: "html" | "expo" | "android";
  preparedFromTemplate: true;
};

/** Prépare un ZIP local utilisable par le compilateur, même sans ordinateur. */
export function prepareStarterProject(id: StarterProjectId): PreparedStarterProject {
  const starter = getStarterProject(id);
  if (!starter) throw new Error("Ce modèle n’est plus disponible.");
  const archive = createZip(starter.files.map((file) => ({ name: file.name, contents: new TextEncoder().encode(file.content) })));
  const target = new File(Paths.cache, `mia-starter-${starter.id}-${Date.now()}.zip`);
  target.create({ intermediates: true, overwrite: true });
  target.write(archive);
  return { name: `modele-${starter.id}.zip`, size: archive.length, uri: target.uri, projectName: starter.projectName, projectType: starter.projectType, preparedFromTemplate: true };
}
