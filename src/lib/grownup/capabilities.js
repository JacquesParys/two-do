// The Grown-Up's app-side capability surface — the functions the parser and the
// clarifying-chat flow lean on, named and grouped in one place. They are thin
// pass-throughs over the data layer (no new logic): all DB access still lives in
// `src/lib/data.js`, honouring the views-only-touch-data boundary.
//
// Why a separate module: this is the surface that would later back an MCP server
// (the home-lab Grown-Up service) once the Grown-Up graduates from *proposing*
// drafts to *taking* actions across surfaces. Keeping it named now means that
// promotion is a wrapper change, not a logic move. See
// docs/plans/two-do-grown-up-claude-api.md §6.
export {
  findOrCreateList,
  listColumns,
  listStores,
  getParserContext as summarizeContext,
} from "../data.js";
