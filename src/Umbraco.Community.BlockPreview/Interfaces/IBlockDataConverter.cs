using Umbraco.Cms.Core.Models.Blocks;
using Umbraco.Cms.Core.Models.PublishedContent;

namespace Umbraco.Community.BlockPreview.Interfaces
{
    /// <summary>
    /// Service for converting and formatting block data.
    /// </summary>
    public interface IBlockDataConverter
    {
        /// <summary>
        /// Deserializes block grid data.
        /// </summary>
        /// <param name="blockData">The raw block data string.</param>
        /// <returns>The deserialized block editor data, or null if deserialization failed.</returns>
        BlockEditorData<BlockGridValue, BlockGridLayoutItem>? DeserializeBlockGrid(string? blockData);

        /// <summary>
        /// Deserializes block list data.
        /// </summary>
        /// <param name="blockData">The raw block data string.</param>
        /// <returns>The deserialized block editor data, or null if deserialization failed.</returns>
        BlockEditorData<BlockListValue, BlockListLayoutItem>? DeserializeBlockList(string? blockData);

        /// <summary>
        /// Deserializes rich text block data.
        /// </summary>
        /// <param name="blockData">The raw block data string.</param>
        /// <returns>The deserialized block editor data, or null if deserialization failed.</returns>
        BlockEditorData<RichTextBlockValue, RichTextBlockLayoutItem>? DeserializeRichText(string? blockData);

        /// <summary>
        /// Deserializes single block data.
        /// </summary>
        /// <param name="blockData">The raw block data string.</param>
        /// <returns>The deserialized block editor data, or null if deserialization failed.</returns>
        BlockEditorData<SingleBlockValue, SingleBlockLayoutItem>? DeserializeSingleBlock(string? blockData);

        /// <summary>
        /// Converts block item data to a published element.
        /// </summary>
        /// <param name="data">The block item data.</param>
        /// <param name="owner">The owner published element.</param>
        /// <returns>The converted published element.</returns>
        IPublishedElement ConvertToElement(BlockItemData data, IPublishedElement owner);

        /// <summary>
        /// Converts block item data to a published element for a culture-variant block property.
        /// </summary>
        /// <param name="data">The block item data.</param>
        /// <param name="owner">The owner published element.</param>
        /// <param name="owningPropertyCulture">The culture of the stored property value <paramref name="data"/> belongs to,
        /// or <c>null</c> when the property holding the block value does not vary by culture.</param>
        /// <returns>The converted published element.</returns>
        // TODO (v8): Remove the default implementation.
        IPublishedElement ConvertToElement(BlockItemData data, IPublishedElement owner, string? owningPropertyCulture)
            => ConvertToElement(data, owner);

        /// <summary>
        /// Formats block data for preview rendering.
        /// </summary>
        /// <param name="blockData">The block data to format.</param>
        void FormatBlockData(List<BlockItemData>? blockData);
    }
}
