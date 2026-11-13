using Microsoft.Extensions.Logging;
using Moq;
using NUnit.Framework;
using Umbraco.Cms.Core.Actions;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PublishedCache;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Services.AuthorizationStatus;
using Umbraco.Community.BlockPreview.Enums;
using Umbraco.Community.BlockPreview.Interfaces;
using Umbraco.Community.BlockPreview.Services;

namespace Umbraco.Community.BlockPreview.Tests.Services;

/// <summary>
/// The element key in a preview request is client-supplied and the element cache only checks permissions inside a
/// website preview session, so the resolver must check the backoffice user's browse permission itself.
/// </summary>
[TestFixture]
public class ExternalElementResolverTests
{
    private static readonly Guid ElementKey = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private Mock<IElementCacheService> _cache = null!;
    private Mock<IElementPermissionService> _permissions = null!;
    private Mock<IBackOfficeSecurityAccessor> _security = null!;
    private IPublishedElement _element = null!;

    [SetUp]
    public void SetUp()
    {
        _element = Mock.Of<IPublishedElement>();
        _cache = new Mock<IElementCacheService>();
        _cache.Setup(c => c.GetByKeyAsync(ElementKey, true)).ReturnsAsync(_element);
        _permissions = new Mock<IElementPermissionService>();
        _security = new Mock<IBackOfficeSecurityAccessor>();
        _security.Setup(s => s.BackOfficeSecurity).Returns(Mock.Of<IBackOfficeSecurity>(b => b.CurrentUser == Mock.Of<IUser>()));
    }

    [Test]
    public async Task Resolve_UserMayBrowse_ReturnsTheDraftElement()
    {
        AllowBrowse(ElementAuthorizationStatus.Success);

        var result = await CreateResolver().ResolveAsync(ElementKey);

        Assert.Multiple(() =>
        {
            Assert.That(result.Status, Is.EqualTo(ExternalElementStatus.Success));
            Assert.That(result.Element, Is.SameAs(_element));
        });
        _cache.Verify(c => c.GetByKeyAsync(ElementKey, true), Times.Once);
        _cache.Verify(c => c.GetByKeyAsync(It.IsAny<Guid>(), It.Is<bool?>(p => p != true)), Times.Never);
    }

    [TestCase(ElementAuthorizationStatus.UnauthorizedMissingPermissionAccess)]
    [TestCase(ElementAuthorizationStatus.UnauthorizedMissingPathAccess)]
    [TestCase(ElementAuthorizationStatus.UnauthorizedMissingRootAccess)]
    [TestCase(ElementAuthorizationStatus.UnauthorizedMissingCulture)]
    public async Task Resolve_UserMayNotBrowse_IsNotPermittedAndNeverReadsTheElement(ElementAuthorizationStatus status)
    {
        AllowBrowse(status);

        var result = await CreateResolver().ResolveAsync(ElementKey);

        Assert.Multiple(() =>
        {
            Assert.That(result.Status, Is.EqualTo(ExternalElementStatus.NotPermitted));
            Assert.That(result.Element, Is.Null);
        });
        _cache.Verify(c => c.GetByKeyAsync(It.IsAny<Guid>(), It.IsAny<bool?>()), Times.Never);
    }

    [Test]
    public async Task Resolve_NoBackofficeUser_IsNotPermittedAndNeverReadsTheElement()
    {
        _security.Setup(s => s.BackOfficeSecurity).Returns((IBackOfficeSecurity?)null);

        var result = await CreateResolver().ResolveAsync(ElementKey);

        Assert.That(result.Status, Is.EqualTo(ExternalElementStatus.NotPermitted));
        _cache.Verify(c => c.GetByKeyAsync(It.IsAny<Guid>(), It.IsAny<bool?>()), Times.Never);
    }

    [Test]
    public async Task Resolve_UnknownElement_IsNotFound()
    {
        AllowBrowse(ElementAuthorizationStatus.NotFound);

        var result = await CreateResolver().ResolveAsync(ElementKey);

        Assert.That(result.Status, Is.EqualTo(ExternalElementStatus.NotFound));
        _cache.Verify(c => c.GetByKeyAsync(It.IsAny<Guid>(), It.IsAny<bool?>()), Times.Never);
    }

    [Test]
    public async Task Resolve_PermittedButNotInTheCache_IsNotFound()
    {
        AllowBrowse(ElementAuthorizationStatus.Success);
        _cache.Setup(c => c.GetByKeyAsync(ElementKey, true)).ReturnsAsync((IPublishedElement?)null);

        Assert.That((await CreateResolver().ResolveAsync(ElementKey)).Status, Is.EqualTo(ExternalElementStatus.NotFound));
    }

    private void AllowBrowse(ElementAuthorizationStatus status) =>
        _permissions
            .Setup(p => p.AuthorizeAccessAsync(It.IsAny<IUser>(), ElementKey, ActionElementBrowse.ActionLetter))
            .ReturnsAsync(status);

    private IExternalElementResolver CreateResolver() =>
        new ExternalElementResolver(_cache.Object, _permissions.Object, _security.Object, Microsoft.Extensions.Logging.Abstractions.NullLogger<ExternalElementResolver>.Instance);
}
