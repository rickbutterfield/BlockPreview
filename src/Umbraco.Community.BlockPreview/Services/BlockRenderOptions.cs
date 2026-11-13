namespace Umbraco.Community.BlockPreview.Services
{
    /// <summary>
    /// Describes which block instance to render and in which culture, beyond the keys the render methods already take.
    /// </summary>
    public sealed class BlockRenderOptions
    {
        /// <summary>
        /// Gets or sets the key of the layout item to render (<c>IBlockLayoutItem.Key</c>). The same content key can
        /// appear several times in one layout (a reusable element used twice), so only this identifies one instance.
        /// When <c>null</c>, the first layout item with the content key is used.
        /// </summary>
        public Guid? LayoutKey { get; set; }

        /// <summary>
        /// Gets or sets the culture of the stored property value the block belongs to, or <c>null</c> when the property
        /// holding the block value does not vary by culture. Same meaning as the <c>owningPropertyCulture</c> of
        /// Umbraco's <c>BlockEditorConverter.ConvertToElement</c>.
        /// </summary>
        public string? OwningPropertyCulture { get; set; }
    }
}
