using Moq;
using NUnit.Framework;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Community.BlockPreview.Helpers;

namespace Umbraco.Community.BlockPreview.Tests.Helpers;

[TestFixture]
public class PreviewContentResolverTests
{
    private static readonly Guid NodeKey = Guid.NewGuid();
    private static readonly Guid ParentKey = Guid.NewGuid();

    private readonly IPublishedContent _node = Mock.Of<IPublishedContent>();
    private readonly IPublishedContent _parent = Mock.Of<IPublishedContent>();
    private readonly IPublishedContent _documentOfType = Mock.Of<IPublishedContent>();

    private Func<Guid, IPublishedContent?> Cache(bool nodeSaved) => key =>
        key == NodeKey && nodeSaved ? _node
        : key == ParentKey ? _parent
        : null;

    [Test]
    public void Resolve_WithSavedNode_UsesNodeAsPageAndContent()
    {
        var documentOfTypeRequested = false;

        var result = PreviewContentResolver.Resolve(
            NodeKey,
            ParentKey,
            Cache(nodeSaved: true),
            () => { documentOfTypeRequested = true; return _documentOfType; });

        Assert.That(result.Page, Is.SameAs(_node));
        Assert.That(result.Content, Is.SameAs(_node));
        Assert.That(documentOfTypeRequested, Is.False);
    }

    [Test]
    public void Resolve_WithUnsavedNode_UsesParentAsPageAndDocumentOfTypeAsContent()
    {
        var result = PreviewContentResolver.Resolve(NodeKey, ParentKey, Cache(nodeSaved: false), () => _documentOfType);

        Assert.That(result.Page, Is.SameAs(_parent));
        Assert.That(result.Content, Is.SameAs(_documentOfType));
    }

    [Test]
    public void Resolve_WithUnsavedNodeAndNoDocumentOfType_UsesParentAsPageAndContent()
    {
        var result = PreviewContentResolver.Resolve(NodeKey, ParentKey, Cache(nodeSaved: false), () => null);

        Assert.That(result.Page, Is.SameAs(_parent));
        Assert.That(result.Content, Is.SameAs(_parent));
    }

    [Test]
    public void Resolve_WithUnsavedNodeAndNoParent_LeavesPageEmptyAndUsesDocumentOfTypeAsContent()
    {
        var result = PreviewContentResolver.Resolve(NodeKey, parentKey: null, Cache(nodeSaved: false), () => _documentOfType);

        Assert.That(result.Page, Is.Null);
        Assert.That(result.Content, Is.SameAs(_documentOfType));
    }
}
