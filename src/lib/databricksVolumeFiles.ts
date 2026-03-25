import {
  getDatabricksHost,
  getDatabricksOAuthAccessToken,
} from "@/lib/databricksWorkspace";

/**
 * Download bytes from a Unity Catalog volume path via Files API.
 * Path must be absolute, e.g. /Volumes/catalog/schema/volume/file.pdf
 * Uses OAuth client credentials (same as SQL Statement API) when PAT is not used.
 */
export async function downloadVolumeFile(absolutePath: string): Promise<Buffer> {
  const host = getDatabricksHost();
  const pat = process.env.DATABRICKS_TOKEN?.trim();
  const bearer = pat || (await getDatabricksOAuthAccessToken());
  const normalized = absolutePath.startsWith("/")
    ? absolutePath
    : `/${absolutePath}`;
  const segments = normalized.split("/").filter((s) => s.length > 0);
  const encodedPath =
    "/" + segments.map((s) => encodeURIComponent(s)).join("/");
  const url = `${host}/api/2.0/fs/files${encodedPath}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${bearer}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Volume file download failed (${res.status}): ${text.slice(0, 400)}`
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}
