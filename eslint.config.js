import convexPlugin from "@convex-dev/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
	{
		ignores: ["convex/_generated/**"],
	},
	{
		files: ["convex/**/*.ts"],
		languageOptions: {
			parser: tsParser,
		},
		plugins: {
			"@convex-dev": convexPlugin,
		},
		rules: {
			"@convex-dev/no-old-registered-function-syntax": "error",
			"@convex-dev/require-args-validator": "error",
			"@convex-dev/import-wrong-runtime": "error",
		},
	},
];
