import { getInput, setFailed, setOutput } from "@actions/core";
import { execSync } from "child_process";
import frontMatter from "front-matter";
import { readdir, readFile, writeFile } from "fs-extra";
import markdownToTxt from "markdown-to-txt";
import { join, resolve } from "path";
import { format } from "prettier";
import truncate from "truncate-sentences";

declare var __non_webpack_require__: any;

interface Item {
  slug: string;
  path: string;
  source: string;
  title?: string;
  excerpt?: string;
  date: Date;
  attributes?: Record<string, unknown>;
  caption?: string;
  emoji?: string;
}

/**
 * Execute a function with the given arguments using eval
 * Largely based on actions/github-script
 * @param args - Arguments for the async function
 * @param source - The source code of the async function as a string
 * @returns The result of the async function
 * @link https://github.com/actions/github-script/blob/v6.3.3/src/async-function.ts#L21
 * @license MIT
 */
export function callAsyncFunction<T = string>(
  args: Item & {
    require: NodeRequire;
    __original_require__: NodeRequire;
  },
  source: string
): Promise<T> {
  const AsyncFunction = Object.getPrototypeOf(async () => null).constructor;
  const fn = new AsyncFunction(...Object.keys(args), source);
  return fn(...Object.values(args));
}
export const wrapRequire = new Proxy(__non_webpack_require__, {
  apply: (target, thisArg, [moduleID]) => {
    if (moduleID.startsWith(".")) {
      moduleID = resolve(moduleID);
      return target.apply(thisArg, [moduleID]);
    }

    const modulePath = target.resolve.apply(thisArg, [
      moduleID,
      {
        // Webpack does not have an escape hatch for getting the actual
        // module, other than `eval`.
        paths: [process.cwd()],
      },
    ]);

    return target.apply(thisArg, [modulePath]);
  },

  get: (target, prop, receiver) => {
    Reflect.get(target, prop, receiver);
  },
});

const getEmoji = async (title: string, excerpt: string): Promise<string | undefined> => {
  const token = getInput("openAiApiKey") || process.env.OPENAI_API_KEY;
  const model = getInput("openAiModel") || "gpt-4.1-mini";

  if (token)
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: `Generate 3 emojis representing the given note. Respond only with exactly three emojis, no other text.`,
            },
            {
              role: "user",
              content: `Title: Startup Visa Application\nExcerpt: Many governments have a some conditions for the startup visa: Working together with a facilitator, the product or service is innovative...`,
            },
            { role: "assistant", content: `🌍💼🚀` },
            {
              role: "user",
              content: `Title: How to upload a file to Google Drive using Python\nExcerpt: To upload a file to Google Drive using Python, you can use the Google Drive API. This API allows you to upload files to Google Drive, create folders, and manage files and folders.`,
            },
            { role: "assistant", content: `🐍💾☁️` },
            {
              role: "user",
              content: `Title: ${title}\nExcerpt: ${excerpt}`,
            },
          ],
        }),
      });
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error(error);
      return undefined;
    }
};

/**
 * Get a item from a file
 * @param directory - The directory where the file resides
 * @param year - The year of the item
 * @param file - The file name
 * @returns Parsed item
 */
const parseItemFile = async (
  directory: string,
  year: string,
  file: string,
  caption?: string,
  currentApi?: Array<Item>
): Promise<Item> => {
  const path = join(".", directory, year, file);
  const source = `https://github.com/${process.env.GITHUB_REPOSITORY}/blob/${process.env.GITHUB_REF_NAME}/${path}`;
  const contents = await readFile(path, "utf8");
  const { attributes, body } = frontMatter<{
    date?: unknown;
    title?: unknown;
    excerpt?: unknown;
    description?: unknown;
    summary?: unknown;
  }>(contents);

  const date: Date =
    "date" in attributes && typeof attributes.date === "string"
      ? new Date(attributes.date)
      : "date" in attributes && typeof attributes.date === "number"
      ? // Arbitiary rule to differentiate ms timestamp from year
        attributes.date < 3000
        ? new Date(`${attributes.date}-01-01`)
        : new Date(attributes.date)
      : "date" in attributes && attributes.date instanceof Date
      ? attributes.date
      : // Use git file creation date if no date is specified
        new Date(
          execSync(`git log --format=%aD ${directory}/${year}/${file} | tail -1`).toString().trim()
        );

  let title = (
    "title" in attributes && typeof attributes.title === "string"
      ? attributes.title
      : body.match(/^# (.*)/m)?.[1]
  )?.trim();

  // If no title found, extract first few words from the post content
  if (!title) {
    const plainText = markdownToTxt(body).trim();
    const words = plainText.split(/\s+/).filter((word) => word.length > 0);
    if (words.length > 0) {
      // Take first 6 words and add ellipsis
      const wordCount = Math.min(words.length, 6);
      const titleWords = words.slice(0, wordCount);
      title = titleWords.join(" ") + "...";
    }
  }

  if (!title) throw new Error(`Unable to parse title in ${path}`);

  const excerpt =
    "excerpt" in attributes && typeof attributes.excerpt === "string"
      ? attributes.excerpt
      : "description" in attributes && typeof attributes.description === "string"
      ? attributes.description
      : "summary" in attributes && typeof attributes.summary === "string"
      ? attributes.summary
      : body.indexOf(title) > -1
      ? body.substring(body.indexOf(title) + title.length)?.trim() ?? body.trim()
      : body.trim();

  const previousItem = currentApi?.find(({ slug }) => slug === file);

  // If the emoji is already set, use it
  let emoji: string | undefined = previousItem?.emoji;
  if (!emoji) {
    emoji =
      "emoji" in attributes && typeof attributes.emoji === "string"
        ? attributes.emoji
        : await getEmoji(title, excerpt);
  }

  const result: Item = {
    slug: file,
    path,
    source,
    title: title,
    date,
    excerpt: excerpt ? truncate(markdownToTxt(excerpt), 500) : undefined,
    attributes,
    emoji,
  };

  if (caption) {
    // I know, I know...
    const captionData = await callAsyncFunction(
      {
        require: wrapRequire,
        __original_require__: __non_webpack_require__,
        ...result,
      },
      caption
    );
    if (captionData) result.caption = captionData;
  }

  return result;
};

export const run = async () => {
  const token = getInput("token") || process.env.GH_PAT || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GitHub token not found");
  const directory = getInput("directory");
  const caption = getInput("caption");
  const commitMessage =
    getInput("commitMessage") || `:pencil: Update ${directory} summary [skip ci]`;
  const commitEmail =
    getInput("commitEmail") || "41898282+github-actions[bot]@users.noreply.github.com";
  const commitUsername = getInput("commitUsername") || "github-actions[bot]";

  const currentApi: Array<Item> = await (async () => {
    try {
      const api = await readFile(join(".", "api.json"), "utf-8");
      return JSON.parse(api);
    } catch (error) {
      return [];
    }
  })();

  const allItems: { [index: string]: Array<Item> } = {};
  let totalItems = 0;
  let pastItems = "";
  let upcomingItems = "";
  const years = await readdir(join(".", directory));
  for await (const year of years) {
    if (!/^\d{4}$/.test(year)) {
      console.warn(`Skipping non-numeric year: ${year}`);
      continue;
    }

    const items = await readdir(join(".", directory, year));
    for await (const item of items) {
      totalItems++;
      allItems[year] = allItems[year] || [];
      const itemFile = await parseItemFile(directory, year, item, caption, currentApi);
      allItems[year].push(itemFile);
    }
  }
  Object.keys(allItems)
    .sort((a, b) => parseInt(b) - parseInt(a))
    .forEach((year) => {
      allItems[year] = allItems[year].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      let addedYears: Array<string> = [];
      allItems[year].forEach((item) => {
        const isPast = new Date(item.date).getTime() < new Date().getTime();
        const text = `${addedYears.includes(year) ? "" : `### ${year}\n\n`}- [${
          item.caption ? "**" : ""
        }${item.emoji ? ` ${item.emoji}` : ""}${item.title || `\`${item.slug}\``}${
          item.caption ? "**" : ""
        }](./${directory}/${year}/${item.slug})${
          item.caption ? `  \n  ${item.caption.split("\n").join("  \n  ")}\n\n` : "\n"
        }`;
        if (isPast) pastItems += text;
        else upcomingItems += text;
        addedYears.push(year);
      });
    });
  let content = `## 🌯 Summary
- ${totalItems} ${directory} in ${years.length} years
`;
  if (upcomingItems.length) content += upcomingItems;
  if (pastItems.length) content += pastItems;
  const originalReadmeContents = format(await readFile(join(".", "README.md"), "utf-8"), {
    parser: "markdown",
  });
  await writeFile(
    join(".", "README.md"),
    format(
      `${
        originalReadmeContents.split("<!--autogenerated-->")[0]
      }<!--autogenerated-->\n\n${content.trim()}\n<!--/autogenerated-->${
        originalReadmeContents.split("<!--/autogenerated-->")[1]
      }`,
      { parser: "markdown" }
    )
  );
  await writeFile(
    join(".", "api.json"),
    JSON.stringify(
      Object.values(allItems)
        .flat()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      null,
      2
    ) + "\n"
  );
  try {
    execSync(`git config --global user.email "${commitEmail}"`, {
      stdio: "inherit",
    });
    execSync(`git config --global user.name "${commitUsername}"`, {
      stdio: "inherit",
    });
    execSync("git pull", { stdio: "inherit" });
    execSync(`git diff --quiet && git diff --staged --quiet || git commit -am "${commitMessage}"`, {
      stdio: "inherit",
    });
    execSync("git push", { stdio: "inherit" });
  } catch (error) {
    console.error(String(error));
    throw new Error(error as any);
  }
  setOutput("number-of-items", totalItems);
};

run().catch((error) => {
  console.error("ERROR", error);
  setFailed(error.message);
});
