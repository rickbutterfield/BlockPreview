using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewComponents;
using Moq;
using NUnit.Framework;
using Umbraco.Cms.Core.Models.Blocks;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Community.BlockPreview.Services;

namespace Umbraco.Community.BlockPreview.Tests.Services;

[TestFixture]
public class BlockViewRendererTests
{
    #region Test ViewComponents

    private class SingleModelViewComponent : ViewComponent
    {
        public IViewComponentResult Invoke(BlockGridItem item) => Content(string.Empty);
    }

    private class ModelAndPageViewComponent : ViewComponent
    {
        public IViewComponentResult Invoke(BlockGridItem model, IPublishedContent? currentPage) => Content(string.Empty);
    }

    private class PropertyNamesViewComponent : ViewComponent
    {
        public IViewComponentResult Invoke(IPublishedElement content, IPublishedElement? settings) => Content(string.Empty);
    }

    #endregion

    private static ViewComponentDescriptor CreateDescriptor<T>()
    {
        var method = typeof(T).GetMethod("Invoke", BindingFlags.Public | BindingFlags.Instance)!;
        return new ViewComponentDescriptor
        {
            TypeInfo = typeof(T).GetTypeInfo(),
            MethodInfo = method,
            Parameters = method.GetParameters()
        };
    }

    private static BlockGridItem CreateBlockGridItem(out IPublishedElement content, out IPublishedElement settings)
    {
        content = Mock.Of<IPublishedElement>();
        settings = Mock.Of<IPublishedElement>();
        return new BlockGridItem(Guid.NewGuid(), content, Guid.NewGuid(), settings);
    }

    [Test]
    public void GetViewComponentArguments_WithNullModel_ReturnsNull()
    {
        var result = BlockViewRenderer.GetViewComponentArguments(
            CreateDescriptor<ModelAndPageViewComponent>(), null, Mock.Of<IPublishedContent>());

        Assert.That(result, Is.Null);
    }

    [Test]
    public void GetViewComponentArguments_WithSingleModelParameter_ReturnsModel()
    {
        var item = CreateBlockGridItem(out _, out _);

        var result = BlockViewRenderer.GetViewComponentArguments(
            CreateDescriptor<SingleModelViewComponent>(), item, Mock.Of<IPublishedContent>());

        Assert.That(result, Is.SameAs(item));
    }

    [Test]
    public void GetViewComponentArguments_WithModelAndPageParameters_BindsByType()
    {
        var item = CreateBlockGridItem(out _, out _);
        var page = Mock.Of<IPublishedContent>();

        var result = BlockViewRenderer.GetViewComponentArguments(
            CreateDescriptor<ModelAndPageViewComponent>(), item, page) as IDictionary<string, object?>;

        Assert.That(result, Is.Not.Null);
        Assert.That(result!["model"], Is.SameAs(item));
        Assert.That(result["currentPage"], Is.SameAs(page));
    }

    [Test]
    public void GetViewComponentArguments_WithPropertyNamedParameters_KeepsModelProperties()
    {
        var item = CreateBlockGridItem(out var content, out var settings);

        var result = BlockViewRenderer.GetViewComponentArguments(
            CreateDescriptor<PropertyNamesViewComponent>(), item, Mock.Of<IPublishedContent>()) as IDictionary<string, object?>;

        Assert.That(result, Is.Not.Null);
        Assert.That(result!["content"], Is.SameAs(content));
        Assert.That(result["settings"], Is.SameAs(settings));
    }
}
