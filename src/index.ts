import { getInput, setFailed, setOutput } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { GitHub } from "@actions/github/lib/utils";
import { readdir, readFile } from "fs-extra";
import { join } from "path";

interface Note {
  slug: string;
  date: Date;
}

const parseNoteFile = async (
  owner: string,
  repo: string,
  octokit: InstanceType<typeof GitHub>,
  year: string,
  file: string
): Promise<Note> => {
  const commits = await octokit.repos.listCommits({ owner, repo, path: `notes/${year}/${file}` });
  return {
    slug: file,
    date: new Date(commits.data[0].commit.author.date),
  };
};

const token = getInput("token") || process.env.GH_PAT || process.env.GITHUB_TOKEN;

export const run = async () => {
  if (!token) throw new Error("GitHub token not found");
  const octokit = getOctokit(token);
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || "").split("/");

  const allNotes: { [index: string]: Array<Note> } = {};
  let totalNotes = 0;
  let pastNotes = "";
  let upcomingNotes = "";
  const years = await readdir(join(".", "notes"));
  for await (const year of years) {
    const notes = await readdir(join(".", "notes", year));
    for await (const note of notes) {
      totalNotes++;
      allNotes[year] = allNotes[year] || [];
      const noteFile = await parseNoteFile(owner, repo, octokit, year, note);
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
        const text = `${addedYears.includes(year) ? "" : `### ${year}\n\n`}- [\`${
          note.slug
        }\`](./notes/${year}/${note.slug}), ${new Date(note.date).toLocaleDateString("en-us", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}\n`;
        if (isPast) pastNotes += text;
        else upcomingNotes += text;
        addedYears.push(year);
      });
    });
  let content = `## 🎤 Summary
- ${totalNotes} notes in ${years.length} years
`;
  if (upcomingNotes.length) content += `## 🔮 Upcoming notes\n\n${upcomingNotes}`;
  if (pastNotes.length) content += `## 📜 Past notes\n\n${pastNotes}`;
  let readmeContents = await readFile(join(".", "README.md"), "utf-8");
  readmeContents = `${
    readmeContents.split("<!--notes-->")[0]
  }<!--notes-->\n\n${content.trim()}\n<!--/notes-->${readmeContents.split("<!--/notes-->")[1]}`;
  const currentContents = await octokit.repos.getContent({
    owner: context.repo.owner,
    repo: context.repo.repo,
    path: "README.md",
  });
  const base64Content = Buffer.from(readmeContents).toString("base64");
  if (
    Buffer.from(currentContents.data.content, "base64").toString("utf8").trim() !==
    readmeContents.trim()
  )
    await octokit.repos.createOrUpdateFileContents({
      owner: context.repo.owner,
      repo: context.repo.repo,
      sha: currentContents.data.sha,
      path: "README.md",
      message: ":pencil: Update notes summary [skip ci]",
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
