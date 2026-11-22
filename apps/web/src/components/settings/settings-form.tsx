"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@bolder/shared";
import { Button, Input } from "@bolder/ui";

import { updateProfileAction } from "./settings-actions";

/** Only plain http(s) links are accepted as a profile photo. */
const IMAGE_URL_RE = /^https?:\/\//;

function monogramOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export interface SettingsFormProps {
  initial: UserProfile;
}

/**
 * Profile settings: display name, photo URL (no file upload — the owner
 * pastes a public image link), and the language switch.
 *
 * Language: English is the only implemented locale. The Portuguese button
 * exists per the product spec but must NOT change anything — clicking it
 * only shows a "coming soon" note (see the i18n note in MODULES.md).
 */
export function SettingsForm({ initial }: SettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [image, setImage] = useState(initial.image ?? "");
  const [imageBroken, setImageBroken] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [ptNotice, setPtNotice] = useState(false);

  const imageTrimmed = image.trim();
  const imageLooksValid = imageTrimmed === "" || IMAGE_URL_RE.test(imageTrimmed);
  const showPreview = imageLooksValid && imageTrimmed !== "" && !imageBroken;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName === "") {
      setError("Display name can't be empty.");
      return;
    }
    if (!imageLooksValid) {
      setError("The photo must be a full http(s) link, starting with https://");
      return;
    }

    setError(null);
    setSaved(false);
    setPending(true);
    try {
      const updated = await updateProfileAction({ name: trimmedName, image: imageTrimmed });
      setName(updated.name);
      setImage(updated.image ?? "");
      setImageBroken(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your settings.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="settings-card" onSubmit={handleSubmit}>
      <section className="settings-section">
        <div className="settings-section-head">
          <h2 className="settings-section-title">Profile photo</h2>
          <p className="settings-section-hint">
            Paste a link to a public image (any hosting — Pinterest, Imgur, Drive…).
          </p>
        </div>
        <div className="settings-photo-row">
          {showPreview ? (
            <img
              className="settings-avatar-preview"
              src={imageTrimmed}
              alt="Profile photo preview"
              onError={() => setImageBroken(true)}
            />
          ) : (
            <div className="settings-avatar-preview settings-avatar-fallback" aria-hidden="true">
              {monogramOf(name)}
            </div>
          )}
          <div className="settings-photo-fields">
            <Input
              label="Photo URL"
              name="image"
              type="url"
              inputMode="url"
              placeholder="https://example.com/your-photo.jpg"
              value={image}
              error={
                imageTrimmed !== "" && !imageLooksValid
                  ? "The link must start with http:// or https://"
                  : undefined
              }
              onChange={(event) => {
                setImage(event.target.value);
                setImageBroken(false);
                setSaved(false);
              }}
            />
            {imageTrimmed !== "" ? (
              <button
                type="button"
                className="settings-link-button"
                onClick={() => {
                  setImage("");
                  setImageBroken(false);
                  setSaved(false);
                }}
              >
                Remove photo
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-head">
          <h2 className="settings-section-title">Display name</h2>
          <p className="settings-section-hint">Shown on your cards, comments and the sidebar.</p>
        </div>
        <Input
          label="Display name"
          name="name"
          maxLength={80}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
        />
      </section>

      <section className="settings-section">
        <div className="settings-section-head">
          <h2 className="settings-section-title">Language</h2>
          <p className="settings-section-hint">The interface language for menus and labels.</p>
        </div>
        <div className="settings-language" role="group" aria-label="Language">
          <button
            type="button"
            className="settings-lang-btn settings-lang-btn-active"
            aria-pressed={true}
            onClick={() => setPtNotice(false)}
          >
            English
          </button>
          <button
            type="button"
            className="settings-lang-btn"
            aria-pressed={false}
            onClick={() => setPtNotice(true)}
          >
            Português
          </button>
        </div>
        {ptNotice ? (
          <p className="settings-language-notice" role="status">
            Portuguese is coming soon — the app stays in English for now.
          </p>
        ) : null}
      </section>

      <div className="settings-actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/app")}>
          Back
        </Button>
        {saved ? (
          <span className="settings-saved" role="status">
            Saved — your sidebar updates right away.
          </span>
        ) : null}
        {error ? (
          <span className="settings-error" role="alert">
            {error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
