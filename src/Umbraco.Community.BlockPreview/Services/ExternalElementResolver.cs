using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Actions;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PublishedCache;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Services.AuthorizationStatus;
using Umbraco.Community.BlockPreview.Enums;
using Umbraco.Community.BlockPreview.Interfaces;

namespace Umbraco.Community.BlockPreview.Services
{
    /// <summary>
    /// Default <see cref="IExternalElementResolver"/>: checks the current backoffice user's browse permission on the
    /// element, as Umbraco's own element endpoints do, then reads the draft from the element cache.
    /// </summary>
    /// <remarks>
    /// <see cref="IElementCacheService"/> only checks permissions inside a website preview session, which a backoffice
    /// request never has, so the check has to be made here.
    /// </remarks>
    internal sealed class ExternalElementResolver : IExternalElementResolver
    {
        private readonly IElementCacheService _elementCacheService;
        private readonly IElementPermissionService _elementPermissionService;
        private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;
        private readonly ILogger<ExternalElementResolver> _logger;

        public ExternalElementResolver(
            IElementCacheService elementCacheService,
            IElementPermissionService elementPermissionService,
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            ILogger<ExternalElementResolver> logger)
        {
            _elementCacheService = elementCacheService;
            _elementPermissionService = elementPermissionService;
            _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<ExternalElementResult> ResolveAsync(Guid elementKey)
        {
            IUser? user = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
            if (user == null)
            {
                _logger.LogWarning("BlockPreview: refused to preview the Library element {ElementKey}: there is no backoffice user", elementKey);
                return new ExternalElementResult(ExternalElementStatus.NotPermitted, null);
            }

            ElementAuthorizationStatus access = await _elementPermissionService.AuthorizeAccessAsync(user, elementKey, ActionElementBrowse.ActionLetter);
            if (access == ElementAuthorizationStatus.NotFound)
            {
                _logger.LogWarning("BlockPreview: could not find the Library element {ElementKey} for an external block", elementKey);
                return new ExternalElementResult(ExternalElementStatus.NotFound, null);
            }

            if (access != ElementAuthorizationStatus.Success)
            {
                _logger.LogWarning("BlockPreview: user {UserKey} may not browse the Library element {ElementKey} ({Access})", user.Key, elementKey, access);
                return new ExternalElementResult(ExternalElementStatus.NotPermitted, null);
            }

            IPublishedElement? element = await _elementCacheService.GetByKeyAsync(elementKey, preview: true);
            if (element == null)
            {
                _logger.LogWarning("BlockPreview: could not find the Library element {ElementKey} for an external block", elementKey);
                return new ExternalElementResult(ExternalElementStatus.NotFound, null);
            }

            return new ExternalElementResult(ExternalElementStatus.Success, element);
        }
    }
}
