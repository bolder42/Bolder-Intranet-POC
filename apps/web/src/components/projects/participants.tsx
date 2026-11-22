import type { ProjectParticipant } from "@bolder/shared";

import { UserAvatar } from "@/components/user/user-avatar";

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
            <span className="participant-head">
              <UserAvatar name={member.user.name} image={member.user.image} size={22} />
              <strong>{member.user.name}</strong> · {member.user.role}
            </span>
            <br />
            {member.user.email}
          </li>
        ))}
      </ul>
    </details>
  );
}
