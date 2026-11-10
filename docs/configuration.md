# Configuration

## Options
The following options can be configured, either in `.AddBlockPreview()` or `appsettings.json`:

```cs
builder.AddBlockPreview(options =>
{
  options.BlockGrid = new()
  {
      Enabled = true,
      ContentTypes = [],
      IgnoredContentTypes = [],
      ViewLocations = [],
      Stylesheets = []
  };

  options.BlockList = new()
  {
      Enabled = true,
      ContentTypes = [],
      IgnoredContentTypes = [],
      ViewLocations = [],
      Stylesheets = []
  };

  options.RichText = new()
  {
      Enabled = true,
      ContentTypes = [],
      IgnoredContentTypes = [],
      ViewLocations = [],
      Stylesheets = []
  };

  options.SingleBlock = new()
  {
      Enabled = true,
      ContentTypes = [],
      IgnoredContentTypes = [],
      ViewLocations = [],
      Stylesheets = []
  };
})
```

```json
{
  "BlockPreview": {
    "BlockGrid": {
      "Enabled": true,
      "ContentTypes": [],
      "IgnoredContentTypes": [],
      "ViewLocations": [],
      "Stylesheets": []
    },
    "BlockList": {
      "Enabled": false,
      "ContentTypes": [],
      "IgnoredContentTypes": [],
      "ViewLocations": [],
      "Stylesheets": []
    },
    "RichText": {
      "Enabled": false,
      "ContentTypes": [],
      "IgnoredContentTypes": [],
      "ViewLocations": [],
      "Stylesheets": []
    },
    "SingleBlock": {
      "Enabled": false,
      "ContentTypes": [],
      "IgnoredContentTypes": [],
      "ViewLocations": [],
      "Stylesheets": []
    }
  }
}
```

## Settings

### BlockPreview
| Property  | Type                                      | Description                                    |
|-----------|-------------------------------------------|------------------------------------------------|
| BlockGrid | [`BlockTypeSettings`](#blocktypesettings) | Configure settings for the Block Grid previews |
| BlockList | [`BlockTypeSettings`](#blocktypesettings) | Configure settings for the Block List previews |
| RichText  | [`BlockTypeSettings`](#blocktypesettings) | Configure settings for the Rich Text previews  |
| SingleBlock | [`BlockTypeSettings`](#blocktypesettings) | Configure settings for the single Block property editor previews. Views default to the Block List Components path (`/Views/Partials/blocklist/Components/{0}.cshtml`). |

### BlockTypeSettings
| Property            | Type                     | Description                                                                                                                                                                                                   |
|---------------------|--------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Enabled             | boolean                  | Toggle previews on or off for a given data type.                                                                                                                                                              |
| ContentTypes        | string[] \| List<string> | A list of content type aliases to enable the previews for. If left blank, all blocks will be enabled.                                                                                                         |
| IgnoredContentTypes | string[] \| List<string> | A list of content type aliases to exclude from previews. Only applies when `ContentTypes` is not set. See [Ignoring Content Types](#ignoring-content-types) for details.                                      |
| ViewLocations       | string[] \| List<string> | A list of custom view paths to be searched for your partial views. Use `{0}` as a placeholder for the content type alias. Custom locations are searched before default paths. Default paths are automatically included. |
| Stylesheets         | string[] \| List<string> | Paths to stylesheets (relative to `/wwwroot`) to be loaded for every block preview of this type. For example: `["/css/grid-layout.css", "/css/custom-blocks.css"]`. Can be overridden by implementing a custom `IBlockPreviewService`. |

## Ignoring Content Types

The `IgnoredContentTypes` property allows you to exclude specific element types from previews without having to explicitly list all the ones you want. This is useful when you have many element types but only want to exclude a few.

Configure in `Program.cs`:
```cs
builder.AddBlockPreview(options =>
{
    options.BlockGrid = new()
    {
        Enabled = true,
        IgnoredContentTypes = ["internalBlock", "deprecatedBlock"]
    };
})
```

Or in `appsettings.json`:
```json
{
  "BlockPreview": {
    "BlockGrid": {
      "Enabled": true,
      "IgnoredContentTypes": ["internalBlock", "deprecatedBlock"]
    }
  }
}
```

**How it works:**

| `ContentTypes` | `IgnoredContentTypes` | Result |
|----------------|----------------------|--------|
| Set | Any | Uses `ContentTypes` as-is (ignores `IgnoredContentTypes`) |
| Empty/not set | Set | All element types minus ignored ones |
| Empty/not set | Empty/not set | Previews enabled for all element types |

- `ContentTypes` takes priority - if you explicitly set `ContentTypes`, the `IgnoredContentTypes` setting is ignored
- `IgnoredContentTypes` is a convenience for "all element types except these"
- The comparison is case-insensitive

## Custom View Locations
If your block partials are not in the usual `/Views/Partials/block[grid|list]/Components/` paths, you can specify custom locations to search for your views. The `ViewLocations` property accepts an array of view paths with a `{0}` placeholder that will be replaced with the content type alias.

You can configure this in `Program.cs`:
```cs
builder.AddBlockPreview(options =>
{
    options.BlockGrid = new()
    {
        Enabled = true,
        ViewLocations = ["/Views/CustomBlocks/{0}.cshtml", "/Views/Themes/Default/BlockGrid/{0}.cshtml"]
    };
})
```

Or in `appsettings.json`:
```json
{
  "BlockPreview": {
    "BlockGrid": {
      "Enabled": true,
      "ViewLocations": ["/Views/CustomBlocks/{0}.cshtml", "/Views/Themes/Default/BlockGrid/{0}.cshtml"]
    }
  }
}
```

**How it works:**
- Custom view locations are searched **before** the default paths
- The default paths (`/Views/Partials/blockgrid/Components/`, `/Views/Partials/blocklist/Components/`, `/Views/Partials/richtext/Components/`) are automatically included and don't need to be specified
- The `{0}` placeholder is replaced with the content element alias (e.g., `heroBlock`)
- Multiple custom locations can be specified and will be searched in order

## Stylesheet Loading
You can specify one or more stylesheets to be loaded for block previews in the backoffice. This is useful for applying custom styles to your blocks without affecting the rest of the backoffice.

Configure in `Program.cs`:
```cs
builder.AddBlockPreview(options =>
{
    options.BlockGrid = new()
    {
        Enabled = true,
        Stylesheets = ["/css/grid-layout.css", "/css/custom-blocks.css"]
    };
    options.BlockList = new()
    {
        Enabled = true,
        Stylesheets = ["/css/list-layout.css"]
    };
})
```

Or in `appsettings.json`:
```json
{
  "BlockPreview": {
    "BlockGrid": {
      "Enabled": true,
      "Stylesheets": ["/css/grid-layout.css", "/css/custom-blocks.css"]
    },
    "BlockList": {
      "Enabled": true,
      "Stylesheets": ["/css/list-layout.css"]
    }
  }
}
```

**Important notes:**
- Stylesheet paths must be relative to the `/wwwroot` directory
- All specified stylesheets will be loaded for **every** block preview of that type in the backoffice
- You can specify different stylesheets for Block Grid, Block List, and Rich Text editors
- Duplicate stylesheet paths are automatically filtered out

### Media queries and the preview width

The preview renders your block's HTML inside the backoffice, in a column that is usually narrower than your live page. Media queries in your stylesheets still follow the width of the **browser window**, not of that column. A rule such as `@media (min-width: 1024px)` (or Tailwind's `lg:`) therefore applies in the preview as if the block had the whole window to itself, while the block's content wraps onto more lines than it does on the live site. Combined with a fixed `max-height` or `overflow: hidden`, this can clip the bottom of a block in the preview.

To keep the preview consistent with the live site you can:
- **Use container queries.** Give a wrapper element in your block's view `container-type: inline-size`, and write the layout rules inside it with `@container`, so they follow the width of the space the block is actually in.
- **Loosen the limits for the preview only.** Stylesheets listed in `Stylesheets` are applied in the order they are listed, and only in block previews. A small extra stylesheet listed after your site's styles can reset `max-height` and `overflow` for blocks in the preview. Alternatively, add a class in your view when `Context.Request.IsBlockPreviewRequest()` is true (see the [Usage Guide](usage.md)) and target that class from your stylesheet.

## Razor Class Library (RCL) Support

BlockPreview works seamlessly with views hosted in Razor Class Libraries (RCLs). If you've configured a custom `IViewLocationExpander` for your RCL views, the same expander will be used for previews in the backoffice.

### How It Works

BlockPreview uses the standard ASP.NET Core Razor view engine and adds its own `IViewLocationExpander` to support custom view locations. This means:

- Any existing `IViewLocationExpander` implementations you've registered are respected
- Views embedded in RCLs are discovered automatically
- No additional configuration is required for RCL support

### Example RCL Setup

If your blocks are in an RCL with views at `/Views/Partials/blocklist/Components/`:

1. Ensure your RCL project has views configured for embedding (this is the default for RCL projects)
2. Register your view location expander as normal in your main project
3. BlockPreview will automatically discover and render these views

```csharp
// Example: Custom view location expander for an RCL
public class MyRclViewLocationExpander : IViewLocationExpander
{
    public void PopulateValues(ViewLocationExpanderContext context) { }

    public IEnumerable<string> ExpandViewLocations(
        ViewLocationExpanderContext context,
        IEnumerable<string> viewLocations)
    {
        // Add your RCL view locations
        return viewLocations.Concat(new[]
        {
            "/Views/Partials/blockgrid/Components/{0}.cshtml",
            "/Views/Partials/blocklist/Components/{0}.cshtml"
        });
    }
}
```

Alternatively, you can use the `ViewLocations` configuration option to specify custom paths without creating an expander:

```json
{
  "BlockPreview": {
    "BlockGrid": {
      "Enabled": true,
      "ViewLocations": ["/Views/MyRcl/BlockGrid/{0}.cshtml"]
    }
  }
}
```

## Runtime mode and Production deployments

BlockPreview renders your block views through the standard ASP.NET Core Razor view engine. For a view to render, it must be available to that engine in one of two ways:

- **Runtime compilation** — the `.cshtml` is compiled on demand from disk, or
- **Precompilation** — the view is compiled into an assembly at build/publish time.

Umbraco only enables Razor **runtime compilation** in the `BackofficeDevelopment` runtime mode (the default for local development). In `Development` and `Production` runtime modes it is switched off.

This means that when you deploy with:

```json
{
  "Umbraco": {
    "CMS": {
      "Runtime": { "Mode": "Production" }
    }
  }
}
```

your Razor views **must be precompiled**, otherwise nothing can render — this affects your whole site (front-end templates included), not just block previews. Enable precompilation in your web project:

```xml
<PropertyGroup>
  <RazorCompileOnBuild>true</RazorCompileOnBuild>
  <RazorCompileOnPublish>true</RazorCompileOnPublish>
</PropertyGroup>
```

> The default Umbraco project template ships with `RazorCompileOnBuild` set to `false` (it relies on runtime compilation). If you switch to `Production` runtime mode without enabling precompilation, block previews will report *"view not found"* — as will your front-end.

With precompilation enabled, BlockPreview resolves the compiled views whether or not the source `.cshtml` files are deployed alongside the app, so a lean publish (`.cshtml` files excluded) works correctly.
