using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Community.BlockPreview.Enums;
using Umbraco.Community.BlockPreview.Services;

namespace Umbraco.Community.BlockPreview.Interfaces
{
    /// <summary>
    /// Service for rendering block previews.
    /// </summary>
    public interface IBlockPreviewService
    {
        /// <summary>
        /// Renders a block grid block.
        /// </summary>
        /// <param name="blockData">The block data.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <param name="blockEditorAlias">The block editor alias.</param>
        /// <param name="documentTypeUnique">The document type unique identifier.</param>
        /// <param name="contentKey">The content key.</param>
        /// <param name="settingsKey">The settings key.</param>
        /// <param name="blockIndex">The block index.</param>
        /// <returns>The rendered HTML.</returns>
        Task<string> RenderGridBlock(string blockData, IPublishedContent content, ControllerContext controllerContext, string blockEditorAlias = "", Guid documentTypeUnique = default, string contentKey = "", string? settingsKey = default, int? blockIndex = 0);

        /// <summary>
        /// Renders a block list block.
        /// </summary>
        /// <param name="blockData">The block data.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <param name="blockEditorAlias">The block editor alias.</param>
        /// <param name="documentTypeUnique">The document type unique identifier.</param>
        /// <param name="contentKey">The content key.</param>
        /// <param name="settingsKey">The settings key.</param>
        /// <param name="blockIndex">The block index.</param>
        /// <returns>The rendered HTML.</returns>
        Task<string> RenderListBlock(string blockData, IPublishedContent content, ControllerContext controllerContext, string blockEditorAlias = "", Guid documentTypeUnique = default, string contentKey = "", string? settingsKey = default, int? blockIndex = 0);

        /// <summary>
        /// Renders a single block.
        /// </summary>
        /// <param name="blockData">The block data.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <param name="blockEditorAlias">The block editor alias.</param>
        /// <param name="documentTypeUnique">The document type unique identifier.</param>
        /// <param name="contentKey">The content key.</param>
        /// <param name="settingsKey">The settings key.</param>
        /// <param name="blockIndex">The block index.</param>
        /// <returns>The rendered HTML.</returns>
        // TODO (v8): Remove the default implementation.
        Task<string> RenderSingleBlock(string blockData, IPublishedContent content, ControllerContext controllerContext, string blockEditorAlias = "", Guid documentTypeUnique = default, string contentKey = "", string? settingsKey = default, int? blockIndex = 0)
            => RenderListBlock(blockData, content, controllerContext, blockEditorAlias, documentTypeUnique, contentKey, settingsKey, blockIndex);

        /// <summary>
        /// Renders a rich text block.
        /// </summary>
        /// <param name="blockData">The block data.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <returns>The rendered HTML.</returns>
        Task<string> RenderRichTextBlock(string blockData, IPublishedContent content, ControllerContext controllerContext);


        /// <summary>
        /// Renders a block grid block, identifying the layout item and culture through <paramref name="options"/>.
        /// </summary>
        /// <param name="blockData">The block data.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <param name="options">The layout item and culture to render.</param>
        /// <param name="blockEditorAlias">The block editor alias.</param>
        /// <param name="documentTypeUnique">The document type unique identifier.</param>
        /// <param name="contentKey">The content key.</param>
        /// <param name="settingsKey">The settings key.</param>
        /// <param name="blockIndex">The block index.</param>
        /// <returns>The rendered HTML.</returns>
        // TODO (v8): Remove the default implementation.
        Task<string> RenderGridBlock(string blockData, IPublishedContent content, ControllerContext controllerContext, BlockRenderOptions options, string blockEditorAlias = "", Guid documentTypeUnique = default, string contentKey = "", string? settingsKey = default, int? blockIndex = 0)
            => RenderGridBlock(blockData, content, controllerContext, blockEditorAlias, documentTypeUnique, contentKey, settingsKey, blockIndex);

        /// <summary>
        /// Renders a block list block, identifying the layout item and culture through <paramref name="options"/>.
        /// </summary>
        /// <param name="blockData">The block data.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <param name="options">The layout item and culture to render.</param>
        /// <param name="blockEditorAlias">The block editor alias.</param>
        /// <param name="documentTypeUnique">The document type unique identifier.</param>
        /// <param name="contentKey">The content key.</param>
        /// <param name="settingsKey">The settings key.</param>
        /// <param name="blockIndex">The block index.</param>
        /// <returns>The rendered HTML.</returns>
        // TODO (v8): Remove the default implementation.
        Task<string> RenderListBlock(string blockData, IPublishedContent content, ControllerContext controllerContext, BlockRenderOptions options, string blockEditorAlias = "", Guid documentTypeUnique = default, string contentKey = "", string? settingsKey = default, int? blockIndex = 0)
            => RenderListBlock(blockData, content, controllerContext, blockEditorAlias, documentTypeUnique, contentKey, settingsKey, blockIndex);

        /// <summary>
        /// Renders a single block, identifying the layout item and culture through <paramref name="options"/>.
        /// </summary>
        /// <param name="blockData">The block data.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <param name="options">The layout item and culture to render.</param>
        /// <param name="blockEditorAlias">The block editor alias.</param>
        /// <param name="documentTypeUnique">The document type unique identifier.</param>
        /// <param name="contentKey">The content key.</param>
        /// <param name="settingsKey">The settings key.</param>
        /// <param name="blockIndex">The block index.</param>
        /// <returns>The rendered HTML.</returns>
        // TODO (v8): Remove the default implementation.
        Task<string> RenderSingleBlock(string blockData, IPublishedContent content, ControllerContext controllerContext, BlockRenderOptions options, string blockEditorAlias = "", Guid documentTypeUnique = default, string contentKey = "", string? settingsKey = default, int? blockIndex = 0)
            => RenderSingleBlock(blockData, content, controllerContext, blockEditorAlias, documentTypeUnique, contentKey, settingsKey, blockIndex);

        /// <summary>
        /// Renders a rich text block, identifying the layout item and culture through <paramref name="options"/>.
        /// </summary>
        /// <param name="blockData">The block data.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <param name="options">The layout item and culture to render.</param>
        /// <returns>The rendered HTML.</returns>
        // TODO (v8): Remove the default implementation.
        Task<string> RenderRichTextBlock(string blockData, IPublishedContent content, ControllerContext controllerContext, BlockRenderOptions options)
            => RenderRichTextBlock(blockData, content, controllerContext);

        /// <summary>
        /// Gets the stylesheet paths for a specific block type.
        /// </summary>
        /// <param name="blockType">The type of block editor.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <returns>A list of stylesheet paths. Returns an empty collection if none configured.</returns>
        Task<IReadOnlyList<string>> GetStylesheetPaths(BlockType blockType, IPublishedContent content, ControllerContext controllerContext);
    }
}
