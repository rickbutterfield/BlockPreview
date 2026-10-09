using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc.ViewEngines;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors.ValueConverters;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Community.BlockPreview.Enums;
using Umbraco.Community.BlockPreview.Interfaces;
using Umbraco.Community.BlockPreview.Services;

namespace Umbraco.Community.BlockPreview.TestSite.Services
{
    /// <inheritdoc/>
    public class CustomBlockPreviewService : BlockPreviewService
    {
        private readonly IRazorViewEngine _razorViewEngine;

        /// <inheritdoc/>
        public CustomBlockPreviewService(
            IRazorViewEngine razorViewEngine,
            IPublishedModelFactory publishedModelFactory,
            BlockEditorConverter blockEditorConverter,
            IOptions<BlockPreviewOptions> options,
            IJsonSerializer jsonSerializer,
            IWebHostEnvironment webHostEnvironment,
            IBlockModelFactory blockModelFactory,
            IBlockViewRenderer blockViewRenderer,
            IBlockDataConverter blockDataConverter,
            IBlockTypeCacheService blockTypeCacheService,
            IBlockPreviewViewResolver viewResolver)
        : base(publishedModelFactory, blockEditorConverter, options, jsonSerializer, blockModelFactory, blockViewRenderer, blockDataConverter, blockTypeCacheService, viewResolver)
            => _razorViewEngine = razorViewEngine;

        /// <inheritdoc/>
        protected override async Task<ViewDataDictionary> CreateViewDataAsync(object? typedBlockInstance, BlockPreviewContext context, bool? hasNestedBlockGrid = false)
            => await base.CreateViewDataAsync(typedBlockInstance, context, hasNestedBlockGrid);

        /// <inheritdoc/>
        public override async Task<IReadOnlyList<string>> GetStylesheetPaths(BlockType blockType, IPublishedContent content, ControllerContext controllerContext)
        {
            var stylesheets = await base.GetStylesheetPaths(blockType, content, controllerContext);

            if (controllerContext.HttpContext.Items.TryGetValue("theme", out var themeObj) && themeObj is string theme)
            {
                // The theme file only holds overrides, so load it after the shared stylesheets.
                return [.. stylesheets, $"/css/themes/{theme.ToLowerInvariant()}.css"];
            }

            return stylesheets;
        }

        /// <inheritdoc/>
        protected override ViewEngineResult? GetViewResult(BlockPreviewContext context)
        {
            if (context.ControllerContext.HttpContext.Items.TryGetValue("theme", out var themeObj) && themeObj is string theme)
            {
                string blockType;
                switch (context.BlockType)
                {
                    case BlockType.BlockGrid:
                        blockType = "Blockgrid";
                        break;
                    case BlockType.BlockList:
                        blockType = "Blocklist";
                        break;
                    case BlockType.RichText:
                        blockType = "Richtext";
                        break;
                    default:
                        return base.GetViewResult(context);
                }

                string themedPath = $"~/Views/Themes/{theme}/{blockType}/Components/{context.ContentAlias}.cshtml";
                return _razorViewEngine.GetView("", themedPath, false);
            }
            return base.GetViewResult(context);
        }
    }
}
