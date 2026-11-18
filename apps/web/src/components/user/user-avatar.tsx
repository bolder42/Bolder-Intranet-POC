import "./user-avatar.css";

export interface UserAvatarProps {
  /** Display name — drives the monogram fallback. */
  name: string;
  /** Public http(s) photo URL; anything else falls back to the monogram. */
  image?: string | null | undefined;
  /** Diameter in pixels (default 24). */
  size?: number;
}

const IMAGE_URL_RE = /^https?:\/\//;

/**
 * Rounded user avatar: the profile photo when there is one, otherwise a
 * monogram (first letter of the name). Decorative by default — pass a name
 * that is also rendered as text next to it, so `alt=""` avoids repetition.
 */
export function UserAvatar({ name, image, size = 24 }: UserAvatarProps) {
  const photo = image && IMAGE_URL_RE.test(image) ? image : null;
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const style = {
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${Math.max(10, Math.round(size * 0.42))}px`,
  };

  if (photo) {
    return <img className="user-avatar" src={photo} alt="" style={style} />;
  }

  return (
    <span className="user-avatar user-avatar-fallback" style={style} aria-hidden="true">
      {initial}
    </span>
  );
}
