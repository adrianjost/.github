const fs = require("fs-extra");
const yaml = require("js-yaml");

const json2yaml = (filename, workflow) => {
  const comment =
    "# GENERATED CONTENT\n# remove repo from adrianjost/.github/synced/workflows/generator.js before editing\n";
  fs.writeFileSync(
    `../${filename}`,
    comment +
      yaml
        .dump(workflow, {
          lineWidth: -1,
          noRefs: true,
        })
        .replace(/(((\*|\?|\d+((\/|\-){0,1}(\d+))*) *){5})/, `'$1'`)
  );
};

const defaultSyncs = [
  "CI-Build",
  "CI-Lint",
  "GitHub Automation",
  "Mergify",
  "Secrets",
];

const defaultExluding = (excludes) =>
  defaultSyncs.filter((sync) => !excludes.includes(sync));

const syncedRepos = {
  "actions-surge.sh-teardown": defaultExluding(["CI-Lint"]),
  "Curriculum-Vitae": defaultExluding(["CI-Lint", "CI-Build"]),
  "files-sync-action": defaultExluding(["CI-Lint", "CI-Build"]),
  "SmartLight-API": defaultExluding(["CI-Lint", "CI-Build"]),
  "SmartLight-Database-Functions": defaultExluding(["CI-Lint", "CI-Build"]),
  "SmartLight-Firmware": ["Secrets", "GitHub Automation"],
  "SmartLight-Google-Home": defaultExluding(["CI-Lint", "CI-Build"]),
  "SmartLight-Homepage": defaultExluding(["CI-Lint"]),
  "SmartLight-Hub-Node": defaultExluding(["CI-Build"]),
  "SmartLight-Web-Client": defaultExluding([]),
  "two-channel-picker": [...defaultSyncs, "CI-Test"],
  "vue-filter-ui": defaultExluding(["CI-Lint", "CI-Build"]),
  doomsday: defaultSyncs,
  fastfeed: defaultExluding(["CI-Lint", "CI-Build"]),
  md2tex: [...defaultExluding(["CI-Lint"]), "CI-Test"],
  PWCalculator: defaultSyncs,
  "image-store": defaultExluding(["CI-Lint", "CI-Build"]),
  "random-notes": defaultExluding(["CI-Lint"]),
};

const getReposForSync = (syncName) =>
  Object.keys(syncedRepos).filter((reponame) =>
    syncedRepos[reponame].includes(syncName)
  );

json2yaml(".github/workflows/sync.yml", {
  name: "Sync",
  on: {
    // schedule: [
    //   {
    //     cron: "0 3 * * *",
    //   },
    // ],
    push: {
      branches: ["main"],
    },
  },
  jobs: {
    secrets: {
      name: "Secrets",
      "runs-on": "ubuntu-latest",
      steps: [
        {
          uses: "jpoehnelt/secrets-sync-action@v1.7.2",
          with: {
            SECRETS: "^SYNCED_\n",
            REPOSITORIES: getReposForSync("Secrets")
              .map((name) => `^adrianjost\\/${name}$`)
              .join("\n"),
            GITHUB_TOKEN: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
          },
          env: {
            SYNCED_GITHUB_TOKEN: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
            SYNCED_TODO_ACTIONS_MONGO_URL:
              "${{ secrets.SYNCED_TODO_ACTIONS_MONGO_URL }}",
          },
        },
      ],
    },
    "github-automation": {
      name: "GitHub Automation",
      "runs-on": "ubuntu-latest",
      needs: "secrets",
      steps: [
        {
          uses: "adrianjost/files-sync-action@master",
          with: {
            COMMIT_MESSAGE: "Update Synced GitHub Automation Workflows",
            GITHUB_TOKEN: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
            FILE_PATTERNS: [
              `^synced-pr-auto-assign\\.yml$`,
              `^synced-dependabot-pr-recreate\\.yml$`,
              `^synced-process-todo-comments\\.yml$`,
            ].join("\n"),
            SRC_ROOT: "/synced-workflows/",
            TARGET_REPOS: getReposForSync("GitHub Automation")
              .map((name) => `adrianjost/${name}`)
              .join("\n"),
            TARGET_ROOT: "/.github/workflows/",
          },
        },
      ],
    },
    mergify: {
      name: "Mergify",
      "runs-on": "ubuntu-latest",
      needs: "github-automation",
      steps: [
        {
          uses: "adrianjost/files-sync-action@master",
          with: {
            COMMIT_MESSAGE: "Update Synced Mergify Config",
            GITHUB_TOKEN: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
            FILE_PATTERNS: [`^\\.mergify.yml$`].join("\n"),
            TARGET_REPOS: getReposForSync("Mergify")
              .map((name) => `adrianjost/${name}`)
              .join("\n"),
          },
        },
      ],
    },
    "ci-lint": {
      name: "CI-Lint",
      "runs-on": "ubuntu-latest",
      needs: "mergify",
      steps: [
        {
          uses: "adrianjost/files-sync-action@master",
          with: {
            COMMIT_MESSAGE: "Update Synced CI-Workflow (Lint)",
            GITHUB_TOKEN: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
            FILE_PATTERNS: [`^synced-lint\\.yml$`].join("\n"),
            SRC_ROOT: "/synced-workflows/",
            TARGET_REPOS: getReposForSync("CI-Lint")
              .map((name) => `adrianjost/${name}`)
              .join("\n"),
            TARGET_ROOT: "/.github/workflows/",
          },
        },
      ],
    },
    "ci-build": {
      name: "CI-Build",
      "runs-on": "ubuntu-latest",
      needs: "ci-lint",
      steps: [
        {
          uses: "adrianjost/files-sync-action@master",
          with: {
            COMMIT_MESSAGE: "Update Synced CI-Workflow (Build)",
            GITHUB_TOKEN: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
            FILE_PATTERNS: [`^synced-build\\.yml$`].join("\n"),
            SRC_ROOT: "/synced-workflows/",
            TARGET_REPOS: getReposForSync("CI-Build")
              .map((name) => `adrianjost/${name}`)
              .join("\n"),
            TARGET_ROOT: "/.github/workflows/",
          },
        },
      ],
    },
    "ci-test": {
      name: "CI-Test",
      "runs-on": "ubuntu-latest",
      needs: "ci-build",
      steps: [
        {
          uses: "adrianjost/files-sync-action@master",
          with: {
            COMMIT_MESSAGE: "Update Synced CI-Workflow (Test)",
            GITHUB_TOKEN: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
            FILE_PATTERNS: [`^synced-test\\.yml$`].join("\n"),
            SRC_ROOT: "/synced-workflows/",
            TARGET_REPOS: getReposForSync("CI-Test")
              .map((name) => `adrianjost/${name}`)
              .join("\n"),
            TARGET_ROOT: "/.github/workflows/",
          },
        },
      ],
    },
  },
});

json2yaml("synced-workflows/synced-pr-auto-assign.yml", {
  name: "PR Automation",
  on: {
    pull_request: {
      types: ["opened"],
    },
  },
  jobs: {
    "assign-author": {
      name: "Assign author to PR",
      "runs-on": "ubuntu-latest",
      steps: [
        {
          name: "Assign author to PR",
          uses: "technote-space/assign-author@v1",
        },
      ],
    },
  },
});

json2yaml("synced-workflows/synced-process-todo-comments.yml", {
  name: "Process TODO comments",
  on: {
    push: {
      branches: ["master", "main"],
    },
  },
  jobs: {
    collectTODO: {
      name: "Collect TODO",
      "runs-on": "ubuntu-latest",
      steps: [
        {
          uses: "actions/checkout@v3",
          with: {
            token: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
          },
        },
        {
          name: "Collect TODO",
          uses: "dtinth/todo-actions@master",
          env: {
            GITHUB_TOKEN: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
            TODO_ACTIONS_MONGO_URL:
              "${{ secrets.SYNCED_TODO_ACTIONS_MONGO_URL }}",
          },
        },
      ],
    },
  },
});

json2yaml("synced-workflows/synced-dependabot-pr-recreate.yml", {
  name: "PR Automation",
  on: {
    issue_comment: {
      types: ["created"],
    },
  },
  jobs: {
    "dependabot-recreate": {
      "runs-on": "ubuntu-latest",
      steps: [
        {
          name: "listen for PR Comments",
          uses: "machine-learning-apps/actions-chatops@master",
          with: {
            TRIGGER_PHRASE:
              "Someone with write access should tell dependabot to recreate this PR.",
          },
          env: {
            GITHUB_TOKEN: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
          },
          id: "prcomm",
        },
        {
          name: "tell dependabot to recreate pr",
          if: "steps.prcomm.outputs.BOOL_TRIGGERED == 'true'",
          uses: "peter-evans/create-or-update-comment@v3",
          with: {
            token: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
            "issue-number": "${{ steps.prcomm.outputs.PULL_REQUEST_NUMBER }}",
            body: "@dependabot recreate",
          },
        },
      ],
    },
  },
});

json2yaml(".mergify.yml", {
  queue_rules: [
    {
      name: "branchProtection",
      conditions: ["-merged"],
    },
  ],
  pull_request_rules: [
    // ######################
    // MERGE PRECONDITIONS
    // ######################
    {
      name: "label PRs with conflicts",
      conditions: ["conflict"],
      actions: {
        label: {
          add: ["has conflicts"],
        },
      },
    },
    {
      name: "remove has conflicts label if conflicts got resolved",
      conditions: ["label~=has conflicts", "-conflict"],
      actions: {
        label: {
          remove: ["has conflicts"],
        },
      },
    },
    {
      name: "let @adrianjost recreate dependabot PRs with conflicts",
      conditions: ["author~=dependabot(-preview)?\\[bot\\]", "conflict"],
      actions: {
        comment: {
          message:
            "Someone with write access should tell dependabot to recreate this PR.",
        },
      },
    },
    // ######################
    // AUTO MERGING
    // ######################
    {
      name: "auto merge passing Dependabot pull requests",
      conditions: ["author~=dependabot(-preview)?\\[bot\\]"],
      actions: {
        queue: {
          name: "branchProtection",
          method: "squash",
        },
      },
    },
    {
      name: "auto merge when ready to merge label is set",
      conditions: ["label=ready to merge"],
      actions: {
        queue: {
          name: "branchProtection",
          method: "merge",
        },
      },
    },
    // ######################
    // CLEANUP AFTER MERGE
    // ######################
    {
      name: "remove ready to merge when merged",
      conditions: ["merged", "label=ready to merge"],
      actions: {
        label: {
          remove: ["ready to merge"],
        },
      },
    },
    {
      name: "delete merged branches",
      conditions: ["merged", "label!=WIP"],
      actions: {
        delete_head_branch: {},
      },
    },
  ],
});

const checkoutCacheAndInstall = [
  {
    uses: "actions/checkout@v3",
  },
  {
    uses: "actions/cache@v3",
    with: {
      path: "~/.npm",
      key: "${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}",
    },
  },
  {
    name: "Install dependencies",
    run: "npm ci",
  },
];

json2yaml("synced-workflows/synced-lint.yml", {
  name: "CI",
  on: "push",
  jobs: {
    lint: {
      name: "Lint",
      "runs-on": "ubuntu-latest",
      steps: [
        ...checkoutCacheAndInstall,
        {
          name: "Check for Lint Issues",
          run: "npm run lint:ci",
        },
      ],
    },
  },
});

json2yaml("synced-workflows/synced-build.yml", {
  name: "CI",
  on: "push",
  jobs: {
    build: {
      name: "Build",
      "runs-on": "ubuntu-latest",
      steps: [
        ...checkoutCacheAndInstall,
        {
          name: "Build Project",
          run: "npm run build",
        },
      ],
    },
  },
});

json2yaml("synced-workflows/synced-test.yml", {
  name: "CI",
  on: "push",
  jobs: {
    test: {
      name: "Test",
      "runs-on": "ubuntu-latest",
      steps: [
        ...checkoutCacheAndInstall,
        {
          name: "Execute Testsuite",
          run: "npm run test",
        },
      ],
    },
  },
});
