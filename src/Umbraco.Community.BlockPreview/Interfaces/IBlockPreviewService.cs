using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Community.BlockPreview.Enums;

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
        Task<string> RenderSingleBlock(string blockData, IPublishedContent content, ControllerContext controllerContext, string blockEditorAlias = "", Guid documentTypeUnique = default, string contentKey = "", string? settingsKey = default, int? blockIndex = 0)
            => RenderListBlock(blockData, content, controllerContext, blockEditorAlias, documentTypeUnique, contentKey, settingsKey, blockIndex);

        /// <summary>
        /// Renders a rich text block.
        /// </summary>
        /// <param name="blockData">The block data.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <param name="blockEditorAlias">The block editor alias (no longer used).</param>
        /// <param name="documentTypeUnique">The document type unique identifier (no longer used).</param>
        /// <returns>The rendered HTML.</returns>
        [Obsolete("Use the overload without blockEditorAlias and documentTypeUnique parameters. Scheduled for removal in v7.")]
        Task<string> RenderRichTextBlock(string blockData, IPublishedContent content, ControllerContext controllerContext, string blockEditorAlias, Guid documentTypeUnique);

        /// <summary>
        /// Renders a rich text block.
        /// </summary>
        /// <param name="blockData">The block data.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <returns>The rendered HTML.</returns>
#pragma warning disable CS0618 // Type or member is obsolete
        Task<string> RenderRichTextBlock(string blockData, IPublishedContent content, ControllerContext controllerContext)
            => RenderRichTextBlock(blockData, content, controllerContext, string.Empty, Guid.Empty);
#pragma warning restore CS0618


        /// <summary>
        /// Gets the stylesheet path for a specific block type.
        /// </summary>
        /// <param name="blockType">The type of block editor.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <returns>The stylesheet path, or null if not found.</returns>
        [Obsolete("Use GetStylesheetPaths instead to support multiple stylesheets. Scheduled for removal in v7.")]
        Task<string?> GetStylesheetPath(BlockType blockType, IPublishedContent content, ControllerContext controllerContext);

        /// <summary>
        /// Gets the stylesheet paths for a specific block type.
        /// </summary>
        /// <param name="blockType">The type of block editor.</param>
        /// <param name="content">The published content.</param>
        /// <param name="controllerContext">The controller context.</param>
        /// <returns>A list of stylesheet paths. Returns an empty collection if none configured.</returns>
#pragma warning disable CS0618 // Type or member is obsolete
        async Task<IReadOnlyList<string>> GetStylesheetPaths(BlockType blockType, IPublishedContent content, ControllerContext controllerContext)
        {
            var path = await GetStylesheetPath(blockType, content, controllerContext);
            return path is not null ? [path] : [];
        }
#pragma warning restore CS0618
    }
}
