# Advanced Customization

## Custom Block Preview Service
For advanced scenarios, you can create a custom implementation of `IBlockPreviewService` to have full control over how blocks are rendered and styled. This is useful when you need:
- Dynamic stylesheet selection based on content properties
- Theme-based view resolution
- Custom rendering logic
- Custom ViewData passed to your views

### Overridable Methods

The `BlockPreviewService` provides several protected virtual methods you can override:

- **`GetStylesheetPaths()`** - Dynamically determine the stylesheet paths for a block preview (returns multiple stylesheets)
- **`GetStylesheetPath()`** - **Deprecated.** Use `GetStylesheetPaths()` instead.
- **`GetViewResult()`** - Customize view resolution logic (e.g., theme-based views)
- **`CreateViewDataAsync()`** - Add custom data to the ViewData dictionary passed to your views (async)
- **`CreateViewData()`** - **Deprecated.** Use `CreateViewDataAsync()` instead.

**Example: Theme-based stylesheets and view location**

```cs
using Umbraco.Community.BlockPreview.Services;
using Umbraco.Community.BlockPreview.Interfaces;
using Umbraco.Community.BlockPreview.Enums;

public class CustomBlockPreviewService : BlockPreviewService
{
    private readonly IRazorViewEngine _razorViewEngine;

    // The first nine parameters are the dependencies of the base BlockPreviewService.
    // You must accept them and forward them to the base constructor.
    // Add any dependencies of your own after them — here IRazorViewEngine, which the
    // GetViewResult override below uses to resolve a themed view.
    public CustomBlockPreviewService(
        IPublishedModelFactory publishedModelFactory,
        BlockEditorConverter blockEditorConverter,
        IOptions<BlockPreviewOptions> options,
        IJsonSerializer jsonSerializer,
        IBlockModelFactory blockModelFactory,
        IBlockViewRenderer blockViewRenderer,
        IBlockDataConverter blockDataConverter,
        IBlockTypeCacheService blockTypeCacheService,
        IBlockPreviewViewResolver viewResolver,
        IRazorViewEngine razorViewEngine)
        : base(publishedModelFactory, blockEditorConverter, options, jsonSerializer,
               blockModelFactory, blockViewRenderer, blockDataConverter,
               blockTypeCacheService, viewResolver)
    {
        _razorViewEngine = razorViewEngine;
    }

    // Override to provide dynamic stylesheet paths
    public override Task<IReadOnlyList<string>> GetStylesheetPaths(BlockType blockType, IPublishedContent content, ControllerContext controllerContext)
    {
        // Check if a theme is set in the request context
        if (controllerContext.HttpContext.Items.TryGetValue("theme", out var themeObj) && themeObj is string theme)
        {
            // Return multiple stylesheets: base styles + theme-specific styles
            var stylesheets = new List<string>
            {
                "/css/block-base.css",
                $"/css/themes/{theme}.css"
            };
            return Task.FromResult<IReadOnlyList<string>>(stylesheets);
        }

        // Fall back to the default configured stylesheets
        return base.GetStylesheetPaths(blockType, content, controllerContext);
    }

    // Override to provide custom view resolution logic
    protected override ViewEngineResult? GetViewResult(BlockPreviewContext context)
    {
        if (context.ControllerContext.HttpContext.Items.TryGetValue("theme", out var themeObj) && themeObj is string theme)
        {
            string blockType = context.BlockType switch
            {
                BlockType.BlockGrid => "Blockgrid",
                BlockType.BlockList => "Blocklist",
                BlockType.RichText => "Richtext",
                _ => null
            };

            if (blockType != null)
            {
                string themedPath = $"~/Views/Themes/{theme}/{blockType}/Components/{context.ContentAlias}.cshtml";
                return _razorViewEngine.GetView("", themedPath, false);
            }
        }
        
        return base.GetViewResult(context);
    }

    // Override to add custom data to ViewData (async)
    protected override async Task<ViewDataDictionary> CreateViewDataAsync(object? typedBlockInstance, BlockPreviewContext context, bool? hasNestedBlockGrid = false)
    {
        // Get the base ViewData (includes model, blockPreview, blockIndex, etc.)
        var viewData = await base.CreateViewDataAsync(typedBlockInstance, context, hasNestedBlockGrid);

        // Add custom data accessible in your views via ViewData
        if (context.ControllerContext.HttpContext.Items.TryGetValue("theme", out var theme))
        {
            viewData["theme"] = theme;
        }

        // Because this override is async, you can await your own work here —
        // for example a database lookup or API call to fetch additional view data,
        // using any services you injected via the constructor.

        return viewData;
    }
}
```

**Default ViewData properties:**

The base `CreateViewData()` method automatically includes the following in ViewData:
- `Model` - The strongly-typed block instance (BlockGridItem, BlockListItem, etc.)
- `blockPreview` - Boolean flag set to `true` (useful for conditional rendering)
- `blockIndex` - The index of the block in the list/grid
- `blockGridPreview` - Boolean flag set to `true` for Block Grid blocks
- `matchingBlockConfig` - Block Grid configuration (only for blocks with areas)

You can access custom ViewData in your Razor views:
```razor
@inherits UmbracoViewPage<BlockGridItem<MyBlock>>

@{
    var theme = ViewData["theme"] as string;
}

<div class="block block--@theme">
    <!-- Your block markup -->
</div>
```

Register your custom service in `Program.cs`:
```cs
builder.CreateUmbracoBuilder()
    .AddBackOffice()
    .AddWebsite()
    .AddDeliveryApi()
    .AddComposers()
    .AddBlockPreview(options => { /* configure options */ })
    .Build();

// Register custom service (must be after AddBlockPreview)
builder.Services.AddUnique<IBlockPreviewService, CustomBlockPreviewService>(ServiceLifetime.Scoped);
```

## Request Enricher
The `IBlockPreviewRequestEnricher` interface allows you to enrich the HTTP request context before blocks are rendered. This is useful for:
- Setting theme information from content properties
- Adding custom data to `HttpContext.Items` for use in views or custom services
- Implementing variant-specific rendering logic

**Example: Setting theme from content property**

```cs
using Umbraco.Community.BlockPreview.Interfaces;

public class BlockPreviewRequestEnricher : IBlockPreviewRequestEnricher
{
    public Task EnrichAsync(
        HttpContext httpContext, 
        IPublishedContent? content, 
        string? blockEditorAlias = null,
        string? contentElementAlias = null, 
        string? contentUdi = null, 
        string? settingsUdi = null, 
        int? blockIndex = null)
    {
        if (content == null)
            return Task.CompletedTask;

        // Get theme from content or ancestors
        var theme = content.Value<string>("theme", fallback: Fallback.ToAncestors);

        if (!string.IsNullOrEmpty(theme))
        {
            // Store theme in HttpContext.Items for use by custom services
            httpContext.Items["theme"] = theme;
        }

        return Task.CompletedTask;
    }
}
```

Register your enricher in `Program.cs`:
```cs
builder.CreateUmbracoBuilder()
    .AddBackOffice()
    .AddWebsite()
    .AddDeliveryApi()
    .AddComposers()
    .AddBlockPreview(options => { /* configure options */ })
    .Build();

// Register custom enricher (must be after AddBlockPreview)
builder.Services.AddUnique<IBlockPreviewRequestEnricher, BlockPreviewRequestEnricher>(ServiceLifetime.Scoped);
```

**Available parameters:**
- `httpContext` - The current HTTP context
- `content` - The published content being edited
- `blockEditorAlias` - The alias of the block editor property
- `contentElementAlias` - The content type alias of the block element
- `contentUdi` - The UDI of the content element
- `settingsUdi` - The UDI of the settings element (if applicable)
- `blockIndex` - The index of the block in the list/grid (if applicable)

## Response Enricher
The `IBlockPreviewResponseEnricher` interface allows you to modify the rendered preview markup, before they are sent to the backoffice. This is useful for:
- Adding additional information to the previews
- Add backoffice specific styling in general

**Example: Adding Content Type name to the preview**

```cs
using Umbraco.Community.BlockPreview.Interfaces;

public class BlockPreviewResponseEnricher : IBlockPreviewResponseEnricher
{
    public Task<string> EnrichAsync(
        string markup,
        HttpContext httpContext,
        IPublishedContent? content,
        string? blockEditorAlias = null,
        string? contentElementAlias = null,
        string? contentUdi = null,
        string? settingsUdi = null,
        int? blockIndex = null
    )
    {
        return Task.FromResult(
            $"<div>Content Type Alias: {contentElementAlias}</div>{markup}"
        );
    }
}
```

Register your enricher in `Program.cs`:
```cs
builder.CreateUmbracoBuilder()
    .AddBackOffice()
    .AddWebsite()
    .AddDeliveryApi()
    .AddComposers()
    .AddBlockPreview(options => { /* configure options */ })
    .Build();

// Register custom enricher (must be after AddBlockPreview)
builder.Services.AddUnique<IBlockPreviewResponseEnricher, BlockPreviewResponseEnricher>(ServiceLifetime.Scoped);
```

**Available parameters:**
- `markup` - The markup rendered by the `BlockPreviewService`
- `httpContext` - The current HTTP context
- `content` - The published content being edited
- `blockEditorAlias` - The alias of the block editor property
- `contentElementAlias` - The content type alias of the block element
- `contentUdi` - The UDI of the content element
- `settingsUdi` - The UDI of the settings element (if applicable)
- `blockIndex` - The index of the block in the list/grid (if applicable)

## Registering from a composer
You can also register a custom service or enricher from your own `IComposer`. BlockPreview only registers its defaults when nothing else has been registered for that interface, so your registration wins whether your composer runs before or after BlockPreview's:

```cs
public class BlockPreviewCustomisationComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.Services.AddUnique<IBlockPreviewRequestEnricher, BlockPreviewRequestEnricher>(ServiceLifetime.Scoped);
    }
}
```

## Replaceable Services

BlockPreview's internal rendering pipeline is split into three focused services that can each be replaced independently. All three are registered as scoped services (per-request), so you can safely inject other scoped services like `IPublishedContentQuery` or access `HttpContext`.

| Interface | Default | Responsibility | Lifecycle |
|-----------|---------|----------------|-----------|
| `IBlockModelFactory` | `BlockModelFactory` | Creates typed content/settings models and block item instances (BlockGridItem, BlockListItem, etc.) | Scoped |
| `IBlockViewRenderer` | `BlockViewRenderer` | Renders block previews using either ViewComponents or partial views | Scoped |
| `IBlockDataConverter` | `BlockDataConverter` | Deserializes raw block JSON and converts block item data to published elements | Scoped |

### IBlockModelFactory

Responsible for creating the strongly-typed model instances used by your Razor views. Override this to customise how models are instantiated — for example, to add default property values or integrate with a custom model builder.

```cs
using Umbraco.Community.BlockPreview.Interfaces;
using Umbraco.Community.BlockPreview.Enums;

public class CustomBlockModelFactory : IBlockModelFactory
{
    private readonly IPublishedValueFallback _publishedValueFallback;

    public CustomBlockModelFactory(IPublishedValueFallback publishedValueFallback)
    {
        _publishedValueFallback = publishedValueFallback;
    }

    public object CreateModel(Type modelType, IPublishedElement element)
    {
        // Models expect a constructor: (IPublishedElement, IPublishedValueFallback)
        var ctor = modelType.GetConstructor(new[] { typeof(IPublishedElement), typeof(IPublishedValueFallback) });
        if (ctor == null)
            throw new InvalidOperationException($"Type {modelType.Name} missing expected constructor.");

        var instance = ctor.Invoke(new object[] { element, _publishedValueFallback });

        // Apply custom logic — e.g., set default values on models that support it
        if (instance is IHasDefaults defaultModel)
        {
            defaultModel.ApplyDefaults();
        }

        return instance;
    }

    public object? CreateBlockItem(
        BlockType blockType, Type contentType, object contentInstance,
        Type? settingsType, object? settingsInstance,
        Guid contentKey, Guid? settingsKey)
    {
        // Block item constructors expect: (Udi contentUdi, TContent content, Udi? settingsUdi, TSettings? settings)
        // Convert Guid keys to Udi format as required by block item constructors
        var contentUdi = Udi.Create(Umbraco.Cms.Core.Constants.UdiEntityType.Element, contentKey);
        var settingsUdi = settingsKey.HasValue
            ? Udi.Create(Umbraco.Cms.Core.Constants.UdiEntityType.Element, settingsKey.Value)
            : null;

        // Build the generic block item type (e.g., BlockGridItem<TContent, TSettings>)
        // and invoke its constructor via reflection.
        // See BlockModelFactory source for the complete implementation with constructor caching.
    }

    public object? CreateBlockInstance(
        BlockType blockType, Type? contentType, IPublishedElement? contentElement,
        Type? settingsType, IPublishedElement? settingsElement,
        Guid contentKey, Guid? settingsKey)
    {
        if (contentType == null || contentElement == null)
            return null;

        var contentInstance = CreateModel(contentType, contentElement);
        var settingsInstance = settingsType != null && settingsElement != null
            ? CreateModel(settingsType, settingsElement)
            : null;

        return CreateBlockItem(blockType, contentType, contentInstance, settingsType, settingsInstance, contentKey, settingsKey);
    }
}
```

### IBlockViewRenderer

Controls how block previews are rendered to HTML. Override this to add custom rendering behaviour, wrap output in additional markup, or change how ViewComponents and partial views are resolved.

```cs
using Umbraco.Community.BlockPreview.Interfaces;
using Umbraco.Community.BlockPreview.Services;

public class CustomBlockViewRenderer : IBlockViewRenderer
{
    public async Task<string> RenderAsync(BlockPreviewContext context, ViewEngineResult? viewResult = null)
    {
        // Try ViewComponent first, fall back to partial view
        var vcResult = await RenderViewComponentAsync(context);
        if (vcResult != null)
            return vcResult;

        if (viewResult?.View != null)
            return await RenderPartialAsync(context, viewResult);

        return string.Empty;
    }

    public async Task<string> RenderPartialAsync(BlockPreviewContext context, ViewEngineResult viewResult)
    {
        // Render a partial view to string using the context's ViewData and ControllerContext.
        // Tip: Inherit from the default BlockViewRenderer and override individual methods
        // rather than implementing the full interface from scratch.
        await using var writer = new StringWriter();
        var viewContext = new ViewContext(context.ControllerContext, viewResult.View!, context.ViewData, new TempDataDictionary(context.ControllerContext.HttpContext, /* ITempDataProvider */), writer, new HtmlHelperOptions());
        await viewResult.View!.RenderAsync(viewContext);
        return writer.ToString();
    }

    public async Task<string?> RenderViewComponentAsync(BlockPreviewContext context)
    {
        // Return null to skip ViewComponent rendering and fall back to partial views
        return null;
    }
}
```

### IBlockDataConverter

Handles deserialisation of raw block JSON from the backoffice and conversion to `IPublishedElement`. Override this to customise how property values are converted or to support custom block data formats.

```cs
using Umbraco.Community.BlockPreview.Interfaces;

public class CustomBlockDataConverter : IBlockDataConverter
{
    private readonly BlockEditorConverter _blockEditorConverter;
    private readonly ILogger<CustomBlockDataConverter> _logger;

    public CustomBlockDataConverter(
        BlockEditorConverter blockEditorConverter,
        ILogger<CustomBlockDataConverter> logger)
    {
        _blockEditorConverter = blockEditorConverter;
        _logger = logger;
    }

    public BlockEditorData<BlockGridValue, BlockGridLayoutItem>? DeserializeBlockGrid(string? blockData)
    {
        // Deserialization methods should return null on failure rather than throwing,
        // as the rendering pipeline treats null as "no data available"
        if (string.IsNullOrWhiteSpace(blockData))
            return null;

        try
        {
            // Custom deserialization logic
            return /* your implementation */;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize Block Grid data");
            return null;
        }
    }

    public BlockEditorData<BlockListValue, BlockListLayoutItem>? DeserializeBlockList(string? blockData) { /* same pattern */ }
    public BlockEditorData<RichTextBlockValue, RichTextBlockLayoutItem>? DeserializeRichText(string? blockData) { /* same pattern */ }

    public IPublishedElement ConvertToElement(BlockItemData data, IPublishedElement owner)
    {
        // This method should throw if the element cannot be created,
        // as a missing element indicates a configuration problem.
        // The default implementation uses BlockEditorConverter.ConvertToElement()
        // to convert BlockItemData into IPublishedElement instances.
        var element = _blockEditorConverter.ConvertToElement(owner, data, PropertyCacheLevel.None, preview: true);
        return element ?? throw new InvalidOperationException($"Unable to find Element {data.ContentTypeAlias}");
    }

    public void FormatBlockData(List<BlockItemData>? blockData)
    {
        // Pre-process block item data before conversion (e.g., normalise property values)
    }
}
```

### Registering Custom Services

Replace any service in `Program.cs` after calling `AddBlockPreview`:

```cs
builder.CreateUmbracoBuilder()
    .AddBackOffice()
    .AddWebsite()
    .AddDeliveryApi()
    .AddComposers()
    .AddBlockPreview()
    .Build();

// Replace individual services as needed (must be after AddBlockPreview)
builder.Services.AddScoped<IBlockModelFactory, CustomBlockModelFactory>();
builder.Services.AddScoped<IBlockViewRenderer, CustomBlockViewRenderer>();
builder.Services.AddScoped<IBlockDataConverter, CustomBlockDataConverter>();
```
