import type { SessionGroup } from "../types.js";
import type { ReadonlySessionGroup } from "./types.js";

export function cloneSessionGroups(
  groups: readonly ReadonlySessionGroup[],
): SessionGroup[] {
  return groups.map((group) => ({
    name: group.name,
    projects: group.projects.map((project) => ({
      name: project.name,
      dirName: project.dirName,
      sessions: project.sessions.map((session) => ({ ...session })),
    })),
  }));
}

export function freezeSessionGroups(
  groups: SessionGroup[],
): readonly ReadonlySessionGroup[] {
  for (const group of groups) {
    for (const project of group.projects) {
      for (const session of project.sessions) {
        Object.freeze(session);
      }
      Object.freeze(project.sessions);
      Object.freeze(project);
    }
    Object.freeze(group.projects);
    Object.freeze(group);
  }
  return Object.freeze(groups);
}
