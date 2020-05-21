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

const defaultSyncs = ["Secrets", "Mergify", "GitHub Automation", "CI-Lint", "CI-Build"]

const defaultExluding = (excludes) => defaultSyncs.filter(sync => !excludes.includes(sync))

const syncedRepos = {
	// "actions-surge.sh-teardown",
	"Calculator-PWA": defaultExluding(["CI-Build"]),
	"Curriculum-Vitae": defaultExluding(["CI-Lint", "CI-Build"]),
	"dedent-tabs": defaultSyncs,
	"fastfeed": defaultExluding(["CI-Lint", "CI-Build"]),
	// "file-inject",
	// "kurswaehler",
	// "license-ci-checker",
	"md2tex": defaultExluding(["CI-Lint", "CI-Build"]),
	// "PR-Changelog-Generator",
	// "report-viewer",
	// "SmartLight-API",
	// "SmartLight-Database-Functions",
	// "SmartLight-Documentation",
	// "SmartLight-Firmware",
	// "SmartLight-Google-Home",
	// "SmartLight-Hardware",
	// "SmartLight-Homepage",
	// "SmartLight-Hub",
	// "SmartLight-V0",
	"SmartLight-Web-Client": defaultExluding(["CI-Lint", "CI-Build"]),
	"SmartLight-Homepage": defaultExluding(["CI-Lint", "CI-Build"]),
	"two-channel-picker": defaultExluding(["CI-Lint", "CI-Build"]),
	"vue-filter-ui": defaultExluding(["CI-Lint", "CI-Build"]),
	"files-sync-action": defaultExluding(["CI-Lint", "CI-Build"]),
};

const getReposForSync = (syncName) => Object.keys(syncedRepos).filter(reponame => syncedRepos[reponame].includes(syncName))


json2yaml(".github/workflows/sync.yml", {
	name: "Sync",
	on: {
		schedule: [
			{
				cron: "0 3 * * *",
			},
		],
		push: {
			branches: ["master"],
		},
	},
	jobs: {
		secrets: {
			name: "Secrets",
			"runs-on": "ubuntu-latest",
			steps: [
				{
					uses: "google/secrets-sync-action@v1.1.3",
					with: {
						SECRETS: "^SYNCED_\n",
						REPOSITORIES: getReposForSync("Secrets")
							.map((name) => `^adrianjost\\/${name}$`)
							.join("\n"),
						GITHUB_TOKEN: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
					},
					env: {
						SYNCED_GITHUB_TOKEN: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
						SYNCED_TODO_ACTIONS_MONGO_URL: "${{ secrets.SYNCED_TODO_ACTIONS_MONGO_URL }}",
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
							`^\\.github\\/workflows\\/synced-pr-auto-assign\\.yml$`,
							`^\\.github\\/workflows\\/synced-process-todo-comments\\.yml$`,
						].join("\n"),
						TARGET_REPOS: getReposForSync("GitHub Automation")
							.map((name) => `adrianjost/${name}`)
							.join("\n"),
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
						FILE_PATTERNS: [
							`^\\.mergify.yml$`,
						].join("\n"),
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
						FILE_PATTERNS: [
							`^\\.github\\/workflows\\/synced-lint\\.yml$`,
						].join("\n"),
						TARGET_REPOS: getReposForSync("CI-Lint")
							.map((name) => `adrianjost/${name}`)
							.join("\n"),
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
						FILE_PATTERNS: [
							`^\\.github\\/workflows\\/synced-build\\.yml$`,
						].join("\n"),
						TARGET_REPOS: getReposForSync("CI-Build")
							.map((name) => `adrianjost/${name}`)
							.join("\n"),
					},
				},
			],
		},
	},
});

json2yaml(".github/workflows/synced-pr-auto-assign.yml", {
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

json2yaml(".github/workflows/synced-process-todo-comments.yml", {
	name: "Process TODO comments",
	on: {
		push: {
			branches: ["master"],
		},
	},
	jobs: {
		collectTODO: {
			name: "Collect TODO",
			"runs-on": "ubuntu-latest",
			steps: [
				{
					uses: "actions/checkout@v2",
					with: {
						token: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
					}
				},
				{
					name: "Collect TODO",
					uses: "dtinth/todo-actions@master",
					env: {
						GITHUB_TOKEN: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
						TODO_ACTIONS_MONGO_URL: "${{ secrets.SYNCED_TODO_ACTIONS_MONGO_URL }}",
					},
				},
			],
		},
	},
});

json2yaml(".mergify.yml", {
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
		// ######################
		// AUTO MERGING
		// ######################
		{
			name: "auto merge passing Dependabot pull requests",
			conditions: ["author~=dependabot(-preview)?\\[bot\\]"],
			actions: {
				merge: {
					method: "squash",
					strict: "smart",
				},
			},
		},
		{
			name: "auto merge when ready to merge label is set",
			conditions: ["label=ready to merge"],
			actions: {
				merge: {
					method: "merge",
					strict: "smart",
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

json2yaml(".github/workflows/synced-lint.yml", {
	name: "CI",
	on: "push",
	jobs: {
		lint: {
			name: "Lint",
			"runs-on": "ubuntu-latest",
			steps: [
				{
					uses: "actions/checkout@v2",
				},
				{
					name: "Install dependencies",
					run: "npm ci"
				},
				{
					name: "Check for Lint Issues",
					run: "npm run lint:ci"
				},
			],
		},
	},
})

json2yaml(".github/workflows/synced-build.yml", {
	name: "CI",
	on: "push",
	jobs: {
		build: {
			name: "Build",
			"runs-on": "ubuntu-latest",
			steps: [
				{
					uses: "actions/checkout@v2",
				},
				{
					name: "Install dependencies",
					run: "npm ci"
				},
				{
					name: "Build Project",
					run: "npm run build"
				},
			],
		},
	},
})