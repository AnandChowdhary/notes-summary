import { getInput, setFailed, setOutput } from "@actions/core";
import { execSync } from "child_process";
import { readdir, readFile, writeFile } from "fs-extra";
import markdownToTxt from "markdown-to-txt";
import { join } from "path";
import { format } from "prettier";
import truncate from "truncate-sentences";

interface Note {
  slug: string;
  title?: string;
  excerpt?: string;
  date: Date;
  words: number;
}

/**
 * Get a note from a file
 * @param dirName - The directory where the file resides
 * @param year - The year of the note
 * @param file - The file name
 * @returns Parsed note
 */
const parseNoteFile = async (dirName: string, year: string, file: string): Promise<Note> => {
  const contents = await readFile(join(".", dirName, year, file), "utf8");
  const dateInput = execSync(`git log --format=%aD ${dirName}/${year}/${file} | tail -1`)
    .toString()
    .trim();
  const date = new Date(dateInput);
  const title =
    (contents.split("\n").find((line) => line.startsWith("title: ")) || "").replace(
      "title: ",
      ""
    ) ||
    (
      (contents.split("\n").find((line) => line.startsWith("# ")) || "").split("# ")[1] || ""
    ).trim() ||
    undefined;
  const excerpt =
    (contents.split("\n").find((line) => line.startsWith("excerpt: ")) || "").replace(
      "excerpt: ",
      ""
    ) ||
    (contents.split("\n").find((line) => line.startsWith("description: ")) || "").replace(
      "description: ",
      ""
    ) ||
    (contents.split("\n").find((line) => line.startsWith("summary: ")) || "").replace(
      "summary: ",
      ""
    ) ||
    (title
      ? ((contents.split(title)[1] || "").includes("---\n")
          ? (contents.split(title)[1] || "").split("---\n").pop() || ""
          : contents.split(title)[1] || ""
        )
          .trim()
          .split("\n")
          .find((line) => line.length > 10) || undefined
      : undefined);
  return {
    slug: file,
    title: title,
    date,
    excerpt: excerpt ? truncate(markdownToTxt(excerpt), 500) : undefined,
    words: contents.split(" ").length,
  };
};

const token = getInput("token") || process.env.GH_PAT || process.env.GITHUB_TOKEN;

export const run = async () => {
  if (!token) throw new Error("GitHub token not found");
  const commitMessage = getInput("commitMessage") || ":pencil: Update notes summary [skip ci]";
  const commitEmail =
    getInput("commitEmail") || "41898282+github-actions[bot]@users.noreply.github.com";
  const commitUsername = getInput("commitUsername") || "github-actions[bot]";
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
      const noteFile = await parseNoteFile(dirName, year, note);
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
        }](./${dirName}/${year}/${note.slug}) (${note.words.toLocaleString(
          "en-US"
        )} words), ${new Date(note.date).toLocaleDateString("en-US", {
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
  const originalReadmeContents = format(await readFile(join(".", "README.md"), "utf-8"), {
    parser: "markdown",
  });
  await writeFile(
    join(".", "README.md"),
    format(
      `${
        originalReadmeContents.split("<!--notes-->")[0]
      }<!--notes-->\n\n${content.trim()}\n<!--/notes-->${
        originalReadmeContents.split("<!--/notes-->")[1]
      }`,
      { parser: "markdown" }
    )
  );
  await writeFile(
    join(".", "api.json"),
    JSON.stringify(
      Object.values(allNotes)
        .flat()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      null,
      2
    ) + "\n"
  );
  try {
    execSync(`git config --global user.email "${commitEmail}"`, { stdio: "inherit" });
    execSync(`git config --global user.name "${commitUsername}"`, { stdio: "inherit" });
    execSync("git pull", { stdio: "inherit" });
    execSync(`git diff --quiet && git diff --staged --quiet || git commit -am "${commitMessage}"`, {
      stdio: "inherit",
    });
    execSync("git push", { stdio: "inherit" });
  } catch (error) {
    console.error(String(error));
    throw new Error(error as any);
  }
  setOutput("number-of-notes", totalNotes);
};

run().catch((error) => {
  console.error("ERROR", error);
  setFailed(error.message);
});
