using System.Reflection;
using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc.ViewComponents;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using NUnit.Framework;
using Umbraco.Cms.Core.Models.Blocks;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Community.BlockPreview.Enums;
using Umbraco.Community.BlockPreview.Interfaces;
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

    private class ObjectParameterViewComponent : ViewComponent
    {
        public IViewComponentResult Invoke(BlockGridItem model, IPublishedContent? currentPage, object? extra = null) => Content(string.Empty);
    }

    private class GenericModelAndPageViewComponent : ViewComponent
    {
        public IViewComponentResult Invoke(BlockGridItem<IPublishedElement> model, IPublishedContent? currentPage) => Content(string.Empty);
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

    [Test]
    public void GetViewComponentArguments_WithObjectParameter_DoesNotFillItByType()
    {
        var item = CreateBlockGridItem(out _, out _);
        var page = Mock.Of<IPublishedContent>();

        var result = BlockViewRenderer.GetViewComponentArguments(
            CreateDescriptor<ObjectParameterViewComponent>(), item, page) as IDictionary<string, object?>;

        Assert.That(result, Is.Not.Null);
        Assert.That(result!["model"], Is.SameAs(item));
        Assert.That(result["currentPage"], Is.SameAs(page));

        // An 'object' parameter accepts anything, so it must keep its default rather than receive the block item.
        Assert.That(result.ContainsKey("extra"), Is.False);
    }

    [Test]
    public void GetViewComponentArguments_WithGenericBlockItem_BindsByType()
    {
        var content = Mock.Of<IPublishedElement>();
        var item = new BlockGridItem<IPublishedElement>(Guid.NewGuid(), content, Guid.NewGuid(), Mock.Of<IPublishedElement>());
        var page = Mock.Of<IPublishedContent>();

        var result = BlockViewRenderer.GetViewComponentArguments(
            CreateDescriptor<GenericModelAndPageViewComponent>(), item, page) as IDictionary<string, object?>;

        Assert.That(result, Is.Not.Null);
        Assert.That(result!["model"], Is.SameAs(item));
        Assert.That(result["currentPage"], Is.SameAs(page));
    }

    // Production passes the arguments from RenderViewComponentAsync to the ViewComponent helper, so check that wiring
    // as well as the helper: a ViewComponent for the alias is found, and what reaches InvokeAsync is the bound arguments.
    [Test]
    public async Task RenderViewComponentAsync_PassesTheBoundArgumentsToTheViewComponentHelper()
    {
        var item = CreateBlockGridItem(out _, out _);
        var page = Mock.Of<IPublishedContent>();

        var selector = new Mock<IViewComponentSelector>();
        selector.Setup(s => s.SelectComponent("CardBlock")).Returns(CreateDescriptor<ModelAndPageViewComponent>());

        object? receivedArguments = null;
        var helper = new Mock<IViewComponentHelperWrapper>();
        helper.Setup(h => h.InvokeAsync(typeof(ModelAndPageViewComponent), It.IsAny<object>()))
            .Callback<Type, object>((_, arguments) => receivedArguments = arguments)
            .ReturnsAsync(new HtmlString("rendered"));

        var renderer = new BlockViewRenderer(
            Mock.Of<ITempDataProvider>(),
            helper.Object,
            Mock.Of<IRazorViewEngine>(),
            selector.Object,
            Mock.Of<IServiceScopeFactory>(),
            Mock.Of<ILogger<BlockViewRenderer>>());

        var controllerContext = new ControllerContext(
            new ActionContext(new DefaultHttpContext(), new RouteData(), new ControllerActionDescriptor()));
        var context = new BlockPreviewContext(controllerContext, page, "cardBlock", BlockType.BlockGrid)
        {
            ViewData = new ViewDataDictionary(new EmptyModelMetadataProvider(), new ModelStateDictionary()) { Model = item }
        };

        var html = await renderer.RenderViewComponentAsync(context);

        Assert.That(html, Is.EqualTo("rendered"));
        var arguments = receivedArguments as IDictionary<string, object?>;
        Assert.That(arguments, Is.Not.Null, "the bound arguments, not the raw block item, reach the ViewComponent helper");
        Assert.That(arguments!["model"], Is.SameAs(item));
        Assert.That(arguments["currentPage"], Is.SameAs(page));
    }
}
