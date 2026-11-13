using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Community.BlockPreview.Services;
using Umbraco.Extensions;

namespace Umbraco.Community.BlockPreview.Helpers
{
    internal static class BlockRenderOptionsFactory
    {
        /// <summary>
        /// Builds the render options for a preview request. As in Umbraco's own block property converters, the owning
        /// property culture is the culture being rendered only when the property holding the block value varies by
        /// culture (its own variance narrowed by its owner's); otherwise there is a single stored value and no culture.
        /// </summary>
        /// <remarks>
        /// The property is looked up on the page. A block editor nested inside another block is not a property of the
        /// page, so it is previewed as invariant.
        /// </remarks>
        public static BlockRenderOptions Create(IPublishedContent? content, string? blockEditorAlias, string? culture, Guid? layoutKey)
        {
            IPublishedPropertyType? propertyType = string.IsNullOrWhiteSpace(blockEditorAlias)
                ? null
                : content?.ContentType.GetPropertyType(blockEditorAlias);

            bool varies = content != null
                && propertyType != null
                && (content.ContentType.Variations & propertyType.Variations).VariesByCulture();

            return new BlockRenderOptions
            {
                LayoutKey = layoutKey,
                OwningPropertyCulture = varies && !string.IsNullOrWhiteSpace(culture) ? culture : null
            };
        }
    }
}
