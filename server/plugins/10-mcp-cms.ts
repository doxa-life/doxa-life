// Registers all CMS MCP tools + the cms://page/* resource against
// the layer's registry. The numeric prefix 10- ensures this runs
// after the layer's 00-mcp-init.ts (which initializes nitroApp.mcpRegistry).

import { getRegistry } from '#mcp-layer'
import type { McpToolDef } from '#mcp-layer'
import { PAGE_TOOLS } from '../mcp/tools/pages'
import { TRANSLATION_TOOLS } from '../mcp/tools/translations'
import { CATEGORY_TOOLS } from '../mcp/tools/categories'
import { ASSET_TOOLS } from '../mcp/tools/assets'
import { TRANSLATE_TOOLS } from '../mcp/tools/translate'
import { cmsPageResource } from '../mcp/resources/pages'

export default defineNitroPlugin(() => {
  const registry = getRegistry()

  // Each registry.register call is generic over the tool's I/O. The
  // shared array's element type is a union, so we register each as
  // an opaque McpToolDef — the registry only reads name/scope/etc.
  const allTools = [...PAGE_TOOLS, ...TRANSLATION_TOOLS, ...CATEGORY_TOOLS, ...ASSET_TOOLS, ...TRANSLATE_TOOLS]
  for (const tool of allTools) {
    registry.register(tool as McpToolDef<unknown, unknown>)
  }

  registry.registerResource(cmsPageResource)
})
