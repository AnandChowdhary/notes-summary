# 🗓 Events Summary GitHub Action

This GitHub Action generates a `README.md` summary for your events repository. You can use the repository as a source of truth for the events you participate it.

[![Build CI](https://github.com/AnandChowdhary/events-summary/workflows/Build%20CI/badge.svg)](https://github.com/AnandChowdhary/events-summary/actions?query=workflow%3A%22Build+CI%22)
[![Release CI](https://github.com/AnandChowdhary/events-summary/workflows/Release%20CI/badge.svg)](https://github.com/AnandChowdhary/events-summary/actions?query=workflow%3A%22Release+CI%22)
[![Node CI](https://github.com/AnandChowdhary/events-summary/workflows/Node%20CI/badge.svg)](https://github.com/AnandChowdhary/events-summary/actions?query=workflow%3A%22Node+CI%22)

## 👩‍💻 Getting started 

First, setup your repository with this file structure:

```
├── README.md
├── .github
│   └── workflows
│       └── readme.yml
└── events
    ├── 2019
    │   ├── event-name.md
    │   └── another-event-name.md
    └── 2020
        └── a-third-event-name.md
```

Add the following comment in your `README.md` file. This will be replaced with a summary of the events you've participated it:

```html
<!--events--><!--/events-->
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
      - name: Update event summary
        uses: AnandChowdhary/events-summary@master
        with:
          token: "${{ secrets.GITHUB_TOKEN }}"
```

Your `README.md` file should then contains a summary of the events in the `events` directory:

![Screenshot of README.md](https://user-images.githubusercontent.com/2841780/97774563-e5ca4600-1b7e-11eb-926e-2bf81e4128bc.png)

## 📄 License

- Code: [MIT](./LICENSE) © [Anand Chowdhary](https://anandchowdhary.com)
- "GitHub" is a trademark of GitHub, Inc.
