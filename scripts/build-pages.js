import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ejs from "ejs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(projectRoot, "dist");
const [owner, repository] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
const basePath =
  owner && repository && repository !== `${owner}.github.io`
    ? `/${repository}/`
    : "/";

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(path.join(outputDirectory, "website"), { recursive: true });

const renderPage = async (template, output, locals = {}) => {
  const html = await ejs.renderFile(
    path.join(projectRoot, "views", template),
    {
      siteBase: basePath,
      staticPages: true,
      ...locals,
    },
    { root: path.join(projectRoot, "views") },
  );

  await writeFile(path.join(outputDirectory, output), html);
};

await renderPage("index.ejs", "index.html", {
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
});
await renderPage("website.ejs", "website/index.html");
await cp(path.join(projectRoot, "public"), outputDirectory, { recursive: true });
