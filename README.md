# 🗓 Notes Summary GitHub Action

This GitHub Action generates a `README.md` summary for your notes repository and an `api.json` JSON API. You can use the workflow to generate a list of items in your repository.

[![Build CI](https://github.com/AnandChowdhary/notes-summary/workflows/Build%20CI/badge.svg)](https://github.com/AnandChowdhary/notes-summary/actions?query=workflow%3A%22Build+CI%22)
[![Release CI](https://github.com/AnandChowdhary/notes-summary/workflows/Release%20CI/badge.svg)](https://github.com/AnandChowdhary/notes-summary/actions?query=workflow%3A%22Release+CI%22)
[![Node CI](https://github.com/AnandChowdhary/notes-summary/workflows/Node%20CI/badge.svg)](https://github.com/AnandChowdhary/notes-summary/actions?query=workflow%3A%22Node+CI%22)

Some sample repositories that use this workflow:

- [AnandChowdhary/notes](https://github.com/AnandChowdhary/notes)
- [AnandChowdhary/events](https://github.com/AnandChowdhary/events)
- [AnandChowdhary/projects](https://github.com/AnandChowdhary/projects)

## 👩‍💻 Getting started

First, setup your repository with this file structure:

```
├── README.md
├── .github
│   └── workflows
│       └── readme.yml
└── notes
    ├── 2019
    │   ├── note-name.md
    │   └── another-note-name.md
    └── 2020
        └── a-third-note-name.md
```

Add the following comment in your `README.md` file. This will be replaced with a summary of the notes you've participated it:

```html
<!--notes--><!--/notes-->
```

Finally, create the GitHub Actions workflow in `.github/workflows/readme.yml`:

```yaml
name: Readme CI
on:
  # When you push to the `main` branch
  push:
    branches: [main]
  # And optionally, once every day
  schedule:
    - cron: "0 0 * * *"
  # To manually run this workflow
  workflow_dispatch:
jobs:
  summarize:
    name: Update README.md and api.json
    runs-on: ubuntu-latest
    # Don't run this workflow when [skip ci] is passed
    if: "!contains(github.event.head_commit.message, '[skip ci]')"
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          # Fetch full history to figure out created date
          fetch-depth: 0
      - name: Update note summary
        uses: AnandChowdhary/notes-summary@master
        with:
          token: "${{ secrets.GITHUB_TOKEN }}"
```

Your `README.md` file should then contains a summary of the notes in the `notes` directory:

![Screenshot of README.md](https://user-images.githubusercontent.com/2841780/99380828-78454600-28f0-11eb-872c-e2a841bb27c7.png)

## 🛠️ Configuration

| Property         | Description     | Required |
| ---------------- | --------------- | -------- |
| `token`          | GitHub token    | Yes      |
| `commitMessage`  | Commit message  | No       |
| `commitEmail`    | Commit email    | No       |
| `commitUsername` | Commit username | No       |
| `dirName`        | Directory       | No       |

## 📄 License

- Code: [MIT](./LICENSE) © [Anand Chowdhary](https://anandchowdhary.com)
- "GitHub" is a trademark of GitHub, Inc.
