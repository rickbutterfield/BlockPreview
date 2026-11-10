namespace Umbraco.Community.BlockPreview.Enums
{
    /// <summary>
    /// The outcome of resolving a Library (external) element for the current backoffice user.
    /// </summary>
    public enum ExternalElementStatus
    {
        /// <summary>The element was found and the user may browse it.</summary>
        Success,

        /// <summary>No such element exists (or it has no draft).</summary>
        NotFound,

        /// <summary>The element exists but the current user has no permission to browse it, or there is no backoffice user.</summary>
        NotPermitted
    }
}
