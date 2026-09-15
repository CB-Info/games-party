import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

import { layerRules } from "./eslint.layers.js";

const CLIENT_FILES = ["src/client/**", "src/games/*/client/**"];
const SERVER_FILES = ["src/server/**", "src/games/*/server/**"];

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    name: "project/root-tooling",
    files: ["*.js", "*.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    name: "project/client-globals",
    files: CLIENT_FILES,
    languageOptions: { globals: globals.browser },
  },
  {
    name: "project/server-globals",
    files: SERVER_FILES,
    languageOptions: { globals: globals.node },
  },
  {
    name: "project/react-hooks",
    files: CLIENT_FILES,
    ...reactHooks.configs.flat.recommended,
  },
  ...layerRules,
  eslintConfigPrettier,
);
