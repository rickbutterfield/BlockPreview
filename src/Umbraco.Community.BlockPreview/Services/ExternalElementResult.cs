using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Community.BlockPreview.Enums;

namespace Umbraco.Community.BlockPreview.Services
{
    /// <summary>
    /// The result of resolving a Library (external) element.
    /// </summary>
    /// <param name="Status">The outcome.</param>
    /// <param name="Element">The element when <paramref name="Status"/> is <see cref="ExternalElementStatus.Success"/>; otherwise <c>null</c>.</param>
    public sealed record ExternalElementResult(ExternalElementStatus Status, IPublishedElement? Element);
}
