# Usage

This package installs a custom Web Component preview for the Block Grid, Block List, Single Block and Rich Text editors in the backoffice.

> [!NOTE]
> BlockPreview 7.x requires Umbraco 19 and .NET 11. The 7.0.0 releases are pre-releases (`7.0.0-beta1`) while Umbraco 19 is in beta.

How components look within the Block Grid before and after enabling BlockPreview:

| Before — default Umbraco block cards | After — with BlockPreview |
| :---: | :---: |
| ![Before: the Block Grid editor showing plain labelled cards](https://raw.githubusercontent.com/rickbutterfield/BlockPreview/v6/dev/.github/assets/preview-before.png) | ![After: the Block Grid editor showing fully rendered block previews](https://raw.githubusercontent.com/rickbutterfield/BlockPreview/v6/dev/.github/assets/preview-after.png) |

## Grid-specific setup
When using the new Block Grid, replace the references below in your default Grid template partial views, and and custom views that render areas:

`/Views/Partials/blockgrid/default.cshtml`
```diff
<div class="umb-block-grid"
     data-grid-columns="@(Model.GridColumns?.ToString() ?? "12");"
     style="--umb-block-grid--grid-columns: @(Model.GridColumns?.ToString() ?? "12");">
-   @await Html.GetBlockGridItemsHtmlAsync(Model)
+   @await Html.GetPreviewBlockGridItemsHtmlAsync(Model)
</div>
```

`/Views/Partials/blockgrid/areas.cshtml`
```diff
<div class="umb-block-grid__area-container"
     style="--umb-block-grid--area-grid-columns: @(Model.AreaGridColumns?.ToString() ?? Model.GridColumns?.ToString() ?? "12");">
    @foreach (var area in Model.Areas)
    {
-       @await Html.GetBlockGridItemAreaHtmlAsync(area)
+       @await Html.GetPreviewBlockGridItemAreaHtmlAsync(area)
    }
</div>
```

`/Views/Partials/blockgrid/area.cshtml`
```diff
<div class="umb-block-grid__area"
     data-area-col-span="@Model.ColumnSpan"
     data-area-row-span="@Model.RowSpan"
     data-area-alias="@Model.Alias"
     style="--umb-block-grid--grid-columns: @Model.ColumnSpan;--umb-block-grid--area-column-span: @Model.ColumnSpan; --umb-block-grid--area-row-span: @Model.RowSpan;">
-   @await Html.GetBlockGridItemsHtmlAsync(Model)
+   @await Html.GetPreviewBlockGridItemsHtmlAsync(Model)
</div>
```

You will also need to use `@await Html.GetPreviewBlockGridItemAreasHtmlAsync(Model)` in any custom Razor views that contain areas, for example...
```diff
<section
    style="background-color: #@backgroundColor"
    @(noBackgroundColor ? "nobackgroundcolor" : null)
    @(hasBrightContrast ? "bright-contrast" : null)>
+   @await Html.GetPreviewBlockGridItemAreasHtmlAsync(Model)
</section>
```

### `ViewComponent` support
If your solution needs to support `ViewComponents`, you will also need to edit your `items.cshtml` file. Your implementation may differ based on your requirements, however when looking up the ViewComponent to Invoke it should resolve the component as follow:

`/Views/Partials/blockgrid/items.cshtml`
```diff
<div
  class="umb-block-grid__layout-item"
  data-content-element-type-alias="@item.Content.ContentType.Alias"
  data-content-element-type-key="@item.Content.ContentType.Key"
  data-element-key="@item.ContentKey"
  data-col-span="@item.ColumnSpan"
  data-row-span="@item.RowSpan"
  style=" --umb-block-grid--item-column-span: @item.ColumnSpan; --umb-block-grid--item-row-span: @item.RowSpan; ">
  @{
+     var viewAlias = item.Content.ContentType.Alias;
+     var viewComponent = Selector.SelectComponent(viewAlias.ToPascalCase()) ?? Selector.SelectComponent(viewAlias.ToCamelCase());
+     if (viewComponent != null)
+     {
+       @await Component.InvokeAsync(viewComponent.TypeInfo.AsType(), item)
+     }
+     else
+     {
        var partialViewName = "blockgrid/Components/" + item.Content.ContentType.Alias;
        try
        {
            @await Html.PartialAsync(partialViewName, item)
        }
        catch (InvalidOperationException)
        {
            <p>
                <strong>Could not render component of type: @(item.Content.ContentType.Alias)</strong>
                <br/>
                This likely happened because the partial view <em>@partialViewName</em> could not be found.
            </p>
        }
+     }
    }
</div>
```

When rendering a preview, BlockPreview invokes your ViewComponent with the block item, and supports these `InvokeAsync` signatures:

- A single parameter that accepts the block item, e.g. `InvokeAsync(BlockGridItem item)`
- Parameters named after the block item's properties, e.g. `InvokeAsync(IPublishedElement content, IPublishedElement? settings)`. With more than one parameter, a name that matches a property of the block item always takes that property's value, whatever the parameter's type, so a parameter called `content`, `settings` or `areas` must be able to accept it.
- Parameters that accept the block item and/or the current page, e.g. `InvokeAsync(BlockGridItem model, IPublishedContent? currentPage)`. Any other parameter whose type accepts the block item or an `IPublishedContent` is filled in the same way, whatever its name; that includes `IPublishedElement`, which gets the page, not the block's content. The current page is the content the preview is shown for; if that document isn't saved yet, it is another document of the same document type (the first one in the content tree, published or not), when there is one. A parameter typed `object` is never filled this way, and any parameter that isn't filled keeps its default value.

If your front-end passes extra arguments, such as `new { model = item, currentPage = Model }`, make sure they follow one of these patterns so the back office preview gets the same values.


All of these extensions can be found in the namespace `Umbraco.Community.BlockPreview.Extensions`. This ensures that the grid editors correctly load in the back office.

## Library (reusable) elements
Blocks that use an element from the Umbraco 19 Library are previewed like any other block, in Block List, Block Grid, Single Block and Rich Text. BlockPreview renders the draft of the Library element, so a change to it shows in every block that uses it. The same Library element can be used more than once in a property; each block previews its own instance.

- **Permissions:** the preview only renders an element the current backoffice user may browse in the Library. Otherwise the block shows the alert "You do not have permission to preview the Library element used by this block."
- **Missing elements:** if the Library element has been deleted or trashed, the block shows "The Library element used by this block could not be found." (In a Block Grid area, the child's own preview shows the alert, and the parent block's `Model.Areas` leaves the missing child out.)
- Replace this behaviour by implementing [`IExternalElementResolver`](advanced-customization.md#iexternalelementresolver).

> [!WARNING]
> **Known limitation on Umbraco 19.0.0-beta1:** a Library element placed inside a Block Grid **area** is lost by the backoffice itself (the Block Grid entry rewrites its layout with no area children while the Library block type loads, and that is saved). BlockPreview cannot recover it. It is not specific to previews; re-test on the next Umbraco 19 pre-release.

## Culture-variant blocks
When the block property varies by culture, the preview renders in the culture you are editing, so a view that reads culture-specific values shows the right language. Invariant properties preview as before. A block editor nested inside another block is previewed as invariant.

## `blockIndex`
`ViewData["blockIndex"]` (and the `blockIndex` passed to enrichers) is the block's position in the property's layout: for a root block its place among the root layout items, for a block inside a Block Grid area its place within that area, and `0` for a block that is not yet in the layout. It is the same for local and Library blocks. Rich Text blocks do not receive a `blockIndex`: `ViewData["blockIndex"]` is `null` there.

## Preview mode
This package adds an `IsBlockPreviewRequest()` extension to `HttpContext.Request`, similar to `IsBackOfficeRequest()` and `IsFrontEndRequest()` so you can add custom code to your views that only appears in the back office.

For example:
```razor
@using Umbraco.Community.BlockPreview.Extensions
@inherits UmbracoViewPage<BlockGridItem<TContent, TSettings>>

@if (Context.Request.IsBlockPreviewRequest())
{
    <p>This content will only be shown to content editors in the back office!</p>
}
```
