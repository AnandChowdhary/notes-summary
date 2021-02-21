import { getInput, setFailed, setOutput } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { GitHub } from "@actions/github/lib/utils";
import { readdir, readFile } from "fs-extra";
import { join } from "path";
import { format } from "prettier";

interface Note {
  slug: string;
  title?: string;
  date: Date;
}

const parseNoteFile = async (
  dirName: string,
  owner: string,
  repo: string,
  octokit: InstanceType<typeof GitHub>,
  year: string,
  file: string
): Promise<Note> => {
  const commits = await octokit.repos.listCommits({
    owner,
    repo,
    path: `${dirName}/${year}/${file}`,
  });
  const contents = await readFile(join(".", dirName, year, file), "utf8");
  return {
    slug: file,
    title:
      (contents.split("\n").find((line) => line.startsWith("title: ")) || "").replace(
        "title: ",
        ""
      ) ||
      (contents.split("\n").find((line) => line.startsWith("# ")) || "").split("# ")[1].trim() ||
      undefined,
    date: new Date(commits.data[commits.data.length - 1].commit.author.date),
  };
};

const token = getInput("token") || process.env.GH_PAT || process.env.GITHUB_TOKEN;

export const run = async () => {
  if (!token) throw new Error("GitHub token not found");
  const octokit = getOctokit(token);
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || "").split("/");

  const commitMessage = getInput("commitMessage") || ":pencil: Update notes summary [skip ci]";
  const dirName = getInput("dirName") || "notes";

  const allNotes: { [index: string]: Array<Note> } = {};
  let totalNotes = 0;
  let pastNotes = "";
  let upcomingNotes = "";
  const years = await readdir(join(".", dirName));
  for await (const year of years) {
    const notes = await readdir(join(".", dirName, year));
    for await (const note of notes) {
      totalNotes++;
      allNotes[year] = allNotes[year] || [];
      const noteFile = await parseNoteFile(dirName, owner, repo, octokit, year, note);
      allNotes[year].push(noteFile);
    }
  }
  Object.keys(allNotes)
    .sort((a, b) => parseInt(b) - parseInt(a))
    .forEach((year) => {
      allNotes[year] = allNotes[year].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      let addedYears: Array<string> = [];
      allNotes[year].forEach((note) => {
        const isPast = new Date(note.date).getTime() < new Date().getTime();
        const text = `${addedYears.includes(year) ? "" : `### ${year}\n\n`}- [${
          note.title || `\`${note.slug}\``
        }](./${dirName}/${year}/${note.slug}), ${new Date(note.date).toLocaleDateString("en-us", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}\n`;
        if (isPast) pastNotes += text;
        else upcomingNotes += text;
        addedYears.push(year);
      });
    });
  let content = `## 🌯 Summary
- ${totalNotes} notes in ${years.length} years
`;
  if (upcomingNotes.length) content += upcomingNotes;
  if (pastNotes.length) content += pastNotes;
  let readmeContents = await readFile(join(".", "README.md"), "utf-8");
  const originalReadmeContents = await readFile(join(".", "README.md"), "utf-8");
  readmeContents = `${
    readmeContents.split("<!--notes-->")[0]
  }<!--notes-->\n\n${content.trim()}\n<!--/notes-->${readmeContents.split("<!--/notes-->")[1]}`;
  const currentContents = await octokit.repos.getContent({
    owner: context.repo.owner,
    repo: context.repo.repo,
    path: "README.md",
  });
  const base64Content = Buffer.from(format(readmeContents.trim(), { parser: "markdown" })).toString(
    "base64"
  );
  if (
    Buffer.from(currentContents.data.content, "base64").toString("utf8").trim() !==
      readmeContents.trim() &&
    originalReadmeContents.trim() !== format(readmeContents.trim(), { parser: "markdown" }).trim()
  )
    await octokit.repos.createOrUpdateFileContents({
      owner: context.repo.owner,
      repo: context.repo.repo,
      sha: currentContents.data.sha,
      path: "README.md",
      message: commitMessage,
      content: base64Content,
    });
  setOutput("Notes updated", totalNotes);
};

run()
  .then(() => {})
  .catch((error) => {
    console.error("ERROR", error);
    setFailed(error.message);
  });
