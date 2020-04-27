const fs = require("fs-extra");
const yaml = require("js-yaml");

const safeWorkflow = (filename, workflow) => {
	const comment =
		"# GENERATED CONTENT\n# remove repo from adrianjost/.github/synced-repos.js before editing\n";
	fs.writeFileSync(
		`../../.github/workflows/${filename}.yml`,
		comment + yaml.dump(workflow, { lineWidth: -1 })
	);
};

const clone = (obj) => JSON.parse(JSON.stringify(obj));

const syncedRepos = [
	// "actions-surge.sh-teardown",
	// "Calculator-PWA",
	// "Curriculum-Vitae",
	// "dedent-tabs",
	// "fastfeed",
	// "feathers-query-stringify",
	// "file-inject",
	// "kurswaehler",
	// "license-ci-checker",
	"md2tex",
	// "OpenGallery",
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
	// "SmartLight-Web-Client",
	"two-channel-picker",
	"vue-filter-ui",
];

safeWorkflow("sync", {
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
						REPOSITORIES: syncedRepos
							.map((name) => `^adrianjost\\/${name}$`)
							.join("\n"),
						GITHUB_TOKEN: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
					},
					env: {
						SYNCED_GITHUB_TOKEN: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
					},
				},
			],
		},
		workflows: {
			name: "Workflows",
			"runs-on": "ubuntu-latest",
			strategy: {
				matrix: {
					repo: clone(syncedRepos),
				},
			},
			steps: [
				{
					uses: "andstor/copycat-action@v3.2.1",
					with: {
						personal_token: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
						src_path: ".github/workflows",
						dst_path: ".github/workflows",
						dst_owner: "adrianjost",
						dst_repo_name: "${{ matrix.repo }}",
						file_filter: "synced-*.yml",
						commit_message:
							"update synced github actions from adrianjost/.github",
					},
				},
			],
		},
		Mergify: {
			name: "Mergify",
			"runs-on": "ubuntu-latest",
			strategy: {
				matrix: {
					repo: syncedRepos,
				},
			},
			steps: [
				{
					uses: "andstor/copycat-action@v3.2.1",
					with: {
						personal_token: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
						src_path: "/",
						dst_path: "/",
						dst_owner: "adrianjost",
						dst_repo_name: "${{ matrix.repo }}",
						file_filter: ".mergify.yml",
						commit_message: "update .mergify.yml from adrianjost/.github",
					},
				},
			],
		},
	},
});

safeWorkflow("synced-pr-automation-auto-assign", {
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

safeWorkflow("synced-pr-automation-comment-reaction", {
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
						TRIGGER_PHRASE: "@adrianjost tell dependabot to recreate PR",
					},
					env: {
						GITHUB_TOKEN: "${{ secrets.SYNCED_GITHUB_TOKEN }}",
					},
					id: "prcomm",
				},
				{
					name: "tell dependabot to recreate pr",
					if: "steps.prcomm.outputs.BOOL_TRIGGERED == 'true'",
					uses: "peter-evans/create-or-update-comment@v1",
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
