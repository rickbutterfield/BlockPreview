using System.Reflection;
using System.Runtime.CompilerServices;
using Moq;
using NUnit.Framework;
using Umbraco.Cms.Core.Cache;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Entities;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PublishedCache;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Web;
using Umbraco.Cms.Infrastructure.Scoping;
using Umbraco.Community.BlockPreview.Controllers;

namespace Umbraco.Community.BlockPreview.Tests.Controllers;

[TestFixture]
public class BlockPreviewApiControllerTests
{
    private static readonly Guid NodeKey = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private static readonly Guid OwnerTypeKey = Guid.Parse("964feee4-efb3-4676-91a0-b960f26e9d92");

    // A Library element is an element node, not a document. Asking the document cache for it builds an element model
    // and throws "Factory returned model of type ... which does not implement IPublishedContent" (issue #373), so
    // GetById is set up to throw for it, as it does in production.
    //
    // A block nested in an element type on a saved page also has an element owner type, but its node key is the
    // page's: Get returns null for it, and the page must still be resolved. A key that matches nothing yet (an unsaved
    // page) also gets null from Get and takes the same route, but the fallback that follows is not exercised here.
    //
    // With a document owner type the entity service must not be called at all: it is a strict mock with no setup.
    [TestCase(true, true, TestName = "GetPublishedContent_LibraryElementKey_DoesNotAskTheDocumentCache")]
    [TestCase(true, false, TestName = "GetPublishedContent_ElementOwnerTypeWithPageKey_ResolvesThePage")]
    [TestCase(false, false, TestName = "GetPublishedContent_DocumentOwnerType_ResolvesThePageWithoutAnEntityLookup")]
    public void GetPublishedContent_ResolvesContent(bool ownerTypeIsElement, bool nodeIsLibraryElement)
    {
        var page = Mock.Of<IPublishedContent>();

        var contentCache = new Mock<IPublishedContentCache>();
        if (nodeIsLibraryElement)
        {
            contentCache.Setup(c => c.GetById(true, NodeKey)).Throws(new InvalidOperationException(
                "Factory returned model of type OneColumnSectionBlock which does not implement IPublishedContent."));
        }
        else
        {
            contentCache.Setup(c => c.GetById(true, NodeKey)).Returns(page);
        }

        var umbracoContext = new Mock<IUmbracoContext>();
        umbracoContext.SetupGet(c => c.Content).Returns(contentCache.Object);
        IUmbracoContext? contextOut = umbracoContext.Object;
        var contextAccessor = new Mock<IUmbracoContextAccessor>();
        contextAccessor.Setup(a => a.TryGetUmbracoContext(out contextOut)).Returns(true);

        var ownerType = new Mock<IPublishedContentType>();
        ownerType.SetupGet(t => t.IsElement).Returns(ownerTypeIsElement);
        var contentTypeCache = new Mock<IPublishedContentTypeCache>();
        contentTypeCache.Setup(c => c.Get(PublishedItemType.Content, OwnerTypeKey)).Returns(ownerType.Object);

        // Get returns null for a key that isn't an element, including a key that doesn't exist yet.
        var entityService = new Mock<IEntityService>(MockBehavior.Strict);
        if (ownerTypeIsElement)
        {
            entityService.Setup(s => s.Get(NodeKey, UmbracoObjectTypes.Element))
                .Returns(nodeIsLibraryElement ? Mock.Of<IEntitySlim>() : null);
        }

        var controller = CreateController(contextAccessor.Object, contentTypeCache.Object, entityService.Object);

        var (content, isActualContent) = GetPublishedContent(controller, NodeKey, OwnerTypeKey);

        if (nodeIsLibraryElement)
        {
            Assert.That(content, Is.Null);
            Assert.That(isActualContent, Is.False);
            contentCache.Verify(c => c.GetById(It.IsAny<bool>(), It.IsAny<Guid>()), Times.Never);
        }
        else
        {
            Assert.That(content, Is.SameAs(page));
            Assert.That(isActualContent, Is.True);
        }

        entityService.VerifyAll();
    }

    // The action's `Guid nodeKey` is Guid.Empty when the request omits it, so there is nothing to look up: the strict
    // IEntityService mock has no setup, so any call to it fails the test.
    [Test]
    public void GetPublishedContent_EmptyNodeKey_DoesNotLookUpTheEntity()
    {
        var contentCache = new Mock<IPublishedContentCache>();
        var umbracoContext = new Mock<IUmbracoContext>();
        umbracoContext.SetupGet(c => c.Content).Returns(contentCache.Object);
        IUmbracoContext? contextOut = umbracoContext.Object;
        var contextAccessor = new Mock<IUmbracoContextAccessor>();
        contextAccessor.Setup(a => a.TryGetUmbracoContext(out contextOut)).Returns(true);

        var ownerType = new Mock<IPublishedContentType>();
        ownerType.SetupGet(t => t.IsElement).Returns(true);
        var contentTypeCache = new Mock<IPublishedContentTypeCache>();
        contentTypeCache.Setup(c => c.Get(PublishedItemType.Content, OwnerTypeKey)).Returns(ownerType.Object);

        var entityService = new Mock<IEntityService>(MockBehavior.Strict);
        var controller = CreateController(contextAccessor.Object, contentTypeCache.Object, entityService.Object);

        var (content, isActualContent) = GetPublishedContent(controller, Guid.Empty, OwnerTypeKey);

        Assert.That(content, Is.Null);
        Assert.That(isActualContent, Is.False);
        entityService.VerifyAll();
    }

    // The controller has a long constructor and no seam, so create it uninitialized and set only the fields that
    // GetPublishedContent reads. The scope provider is a mock that returns mocks, so a call that falls through to the
    // document cache fallback gets a scope; the runtime cache mock never runs the factory, so it returns null.
    private static BlockPreviewApiController CreateController(
        IUmbracoContextAccessor contextAccessor,
        IPublishedContentTypeCache contentTypeCache,
        IEntityService entityService)
    {
        var controller = (BlockPreviewApiController)RuntimeHelpers.GetUninitializedObject(typeof(BlockPreviewApiController));

        SetField(controller, "_umbracoContextAccessor", contextAccessor);
        SetField(controller, "_contentTypeCache", contentTypeCache);
        SetField(controller, "_entityService", entityService);
        SetField(controller, "_scopeProvider", new Mock<IScopeProvider> { DefaultValue = DefaultValue.Mock }.Object);
        SetField(controller, "_runtimeCache", new Mock<IAppPolicyCache>().Object);
        SetField(controller, "_documentCacheService", new Mock<IDocumentCacheService>().Object);

        return controller;
    }

    private static (IPublishedContent? Content, bool IsActualContent) GetPublishedContent(
        BlockPreviewApiController controller, Guid nodeKey, Guid documentTypeUnique)
    {
        var method = typeof(BlockPreviewApiController).GetMethod(
            "GetPublishedContent",
            BindingFlags.NonPublic | BindingFlags.Instance,
            binder: null,
            types: [typeof(Guid?), typeof(Guid?), typeof(bool).MakeByRefType()],
            modifiers: null);
        Assert.That(method, Is.Not.Null,
            "BlockPreviewApiController no longer has the private GetPublishedContent(Guid?, Guid?, out bool) overload; update this test.");

        object?[] args = [nodeKey, documentTypeUnique, false];
        var content = (IPublishedContent?)method!.Invoke(controller, args);
        return (content, (bool)args[2]!);
    }

    private static void SetField(object target, string name, object value)
    {
        var field = typeof(BlockPreviewApiController).GetField(name, BindingFlags.NonPublic | BindingFlags.Instance);
        Assert.That(field, Is.Not.Null, $"BlockPreviewApiController no longer has a field named {name}; update this test.");
        field!.SetValue(target, value);
    }
}
