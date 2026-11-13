using Umbraco.Cms.Core.Models.PublishedContent;

namespace Umbraco.Community.BlockPreview.Helpers
{
    /// <summary>
    /// The content a preview renders with.
    /// </summary>
    /// <param name="Page">The content that stands in for the current page on the published request.</param>
    /// <param name="Content">The content that owns the block data and goes to the enrichers and the renderer.</param>
    internal readonly record struct PreviewContent(IPublishedContent? Page, IPublishedContent? Content);

    /// <summary>
    /// Resolves the content a preview renders with, including for a node that has not been saved yet.
    /// </summary>
    internal static class PreviewContentResolver
    {
        /// <summary>
        /// Resolves the page and the content for a preview.
        /// </summary>
        /// <param name="nodeKey">The key of the node being edited.</param>
        /// <param name="parentKey">The key of the node's parent, used while the node has not been saved yet.</param>
        /// <param name="getById">Looks up content by key.</param>
        /// <param name="getDocumentOfType">Finds a document of the node's own type.</param>
        public static PreviewContent Resolve(
            Guid? nodeKey,
            Guid? parentKey,
            Func<Guid, IPublishedContent?> getById,
            Func<IPublishedContent?> getDocumentOfType)
        {
            IPublishedContent? node = nodeKey.HasValue ? getById(nodeKey.Value) : null;
            if (node != null)
                return new PreviewContent(node, node);

            // A node that has not been saved yet is not in the cache. Its parent sits where the node will,
            // so the preview renders within the same site, ancestors and domain culture.
            IPublishedContent? parent = parentKey.HasValue ? getById(parentKey.Value) : null;

            // The parent usually has another document type, so it only owns the block data when no document
            // of the node's own type exists yet.
            return new PreviewContent(parent, getDocumentOfType() ?? parent);
        }
    }
}
