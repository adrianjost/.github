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

const syncedRepos = [
	// "actions-surge.sh-teardown",
	// "Calculator-PWA",
	"Curriculum-Vitae",
	"dedent-tabs",
	"fastfeed",
	// "file-inject",
	// "kurswaehler",
	// "license-ci-checker",
	"md2tex",
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
	"SmartLight-Web-Client",
	"two-channel-picker",
	"vue-filter-ui",
	"files-sync-action",
];

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
			needs: "secrets",
			name: "Workflows",
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
						src_path: ".github/workflows/.",
						dst_owner: "adrianjost",
						dst_repo_name: "${{ matrix.repo }}",
						file_filter: "synced-*.yml",
						commit_message:
							"update synced github actions from adrianjost/.github",
					},
				},
			],
		},
		mergify: {
			needs: "workflows",
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
						src_path: "/.",
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

json2yaml(".github/workflows/synced-pr-automation-auto-assign.yml", {
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

json2yaml(".github/workflows/synced-pr-automation-comment-reaction.yml", {
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
						TRIGGER_PHRASE: "Someone with write access should tell dependabot to recreate this PR.",
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
		{
			name: "let @adrianjost recreate dependabot PRs with conflicts",
			conditions: ["author~=dependabot(-preview)?\\[bot\\]", "conflict"],
			actions: {
				comment: {
					message: "Someone with write access should tell dependabot to recreate this PR.",
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
