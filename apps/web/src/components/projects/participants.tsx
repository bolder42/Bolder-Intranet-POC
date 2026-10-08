import type { ProjectParticipant } from "@bolder/shared";
export function Participants({ members }: { members: ProjectParticipant[] }) {
  return (
    <details className="project-participants">
      <summary>
        {members.length} participants
        {members.length
          ? ` · ${members
              .slice(0, 3)
              .map((member) => member.user.name)
              .join(", ")}${members.length > 3 ? "…" : ""}`
          : ""}
      </summary>
      <ul className="list-plain">
        {members.map((member) => (
          <li key={member.id}>
            <strong>{member.user.name}</strong> · {member.user.role}
            <br />
            {member.user.email}
          </li>
        ))}
      </ul>
    </details>
  );
}
