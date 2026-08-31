/**
 * @type {import("prettier").Config}
 *
 * These values match Prettier 3.x defaults today; they are pinned explicitly so
 * formatting stays stable if a future Prettier release changes its defaults.
 */
const config = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 80,
  tabWidth: 2,
  arrowParens: "always",
};

export default config;
