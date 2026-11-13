using Umbraco.Community.BlockPreview.Services;

namespace Umbraco.Community.BlockPreview.Interfaces
{
    /// <summary>
    /// Resolves the Library element behind a block whose layout item has <c>IsExternalContent</c> set, for the
    /// backoffice user making the request.
    /// </summary>
    /// <remarks>
    /// The element key comes from the client, so an implementation must check that the current user may browse the
    /// element before it returns any of its content.
    /// </remarks>
    public interface IExternalElementResolver
    {
        /// <summary>
        /// Resolves a Library element in its draft (preview) state for the current backoffice user.
        /// </summary>
        /// <param name="elementKey">The key of the Library element.</param>
        /// <returns>The element, or why it could not be returned.</returns>
        Task<ExternalElementResult> ResolveAsync(Guid elementKey);
    }
}
