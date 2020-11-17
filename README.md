# 🗓 Notes Summary GitHub Action

This GitHub Action generates a `README.md` summary for your notes repository. You can use the workflow to generate a list of items in your repository.

[![Build CI](https://github.com/AnandChowdhary/notes-summary/workflows/Build%20CI/badge.svg)](https://github.com/AnandChowdhary/notes-summary/actions?query=workflow%3A%22Build+CI%22)
[![Release CI](https://github.com/AnandChowdhary/notes-summary/workflows/Release%20CI/badge.svg)](https://github.com/AnandChowdhary/notes-summary/actions?query=workflow%3A%22Release+CI%22)
[![Node CI](https://github.com/AnandChowdhary/notes-summary/workflows/Node%20CI/badge.svg)](https://github.com/AnandChowdhary/notes-summary/actions?query=workflow%3A%22Node+CI%22)

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
  push:
    branches: [master]
  schedule:
    - cron: "0 0 * * *"
jobs:
  release:
    name: Update README
    runs-on: ubuntu-18.04
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Update note summary
        uses: AnandChowdhary/notes-summary@master
        with:
          token: "${{ secrets.GITHUB_TOKEN }}"
```

Your `README.md` file should then contains a summary of the notes in the `notes` directory:

![Screenshot of README.md](https://user-images.githubusercontent.com/2841780/99380828-78454600-28f0-11eb-872c-e2a841bb27c7.png)

You can see this example repository: https://github.com/AnandChowdhary/notes

## 📄 License

- Code: [MIT](./LICENSE) © [Anand Chowdhary](https://anandchowdhary.com)
- "GitHub" is a trademark of GitHub, Inc.
